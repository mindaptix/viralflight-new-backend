import {
  MetaApiError,
  MetaConfigError,
  buildStateToken,
  decryptToken,
  encryptToken,
  verifyStateToken,
} from "../meta/MetaGraphService.js";

const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";

class YoutubeConfigError extends MetaConfigError {
  constructor(message) {
    super(message);
    this.name = "YoutubeConfigError";
  }
}

class YoutubeApiError extends MetaApiError {
  constructor(message, details = {}) {
    super(message, details);
    this.name = "YoutubeApiError";
  }
}

const getGoogleClientId = () => process.env.GOOGLE_CLIENT_ID;
const getGoogleClientSecret = () => process.env.GOOGLE_CLIENT_SECRET;
const getYoutubeRedirectUri = () =>
  process.env.YOUTUBE_REDIRECT_URI ||
  process.env.GOOGLE_REDIRECT_URI_YOUTUBE;

const requireGoogleConfig = () => {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const redirectUri = getYoutubeRedirectUri();

  if (!clientId) {
    throw new YoutubeConfigError("GOOGLE_CLIENT_ID is required for YouTube connect");
  }

  if (!clientSecret) {
    throw new YoutubeConfigError(
      "GOOGLE_CLIENT_SECRET is required for YouTube connect"
    );
  }

  if (!redirectUri) {
    throw new YoutubeConfigError(
      "YOUTUBE_REDIRECT_URI is required for YouTube connect"
    );
  }

  return { clientId, clientSecret, redirectUri };
};

const parseJsonSafe = async (response) => {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (error) {
    return { raw: text };
  }
};

const buildConnectUrl = (user) => {
  const { clientId, redirectUri } = requireGoogleConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: YOUTUBE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: buildStateToken(user, "youtube"),
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
};

const requestGoogleToken = async (body) => {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await parseJsonSafe(response);

  if (!response.ok || payload.error) {
    throw new YoutubeApiError(
      payload.error_description || payload.error || "Google token request failed",
      {
        statusCode: response.status || 502,
        code: payload.error,
      }
    );
  }

  return payload;
};

const exchangeCodeForTokens = async (code) => {
  const { clientId, clientSecret, redirectUri } = requireGoogleConfig();

  return requestGoogleToken(
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code,
    })
  );
};

const refreshAccessToken = async (refreshToken) => {
  const { clientId, clientSecret } = requireGoogleConfig();

  return requestGoogleToken(
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    })
  );
};

const getMyChannel = async (accessToken) => {
  const url = new URL(YOUTUBE_CHANNELS_URL);
  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set("mine", "true");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = await parseJsonSafe(response);

  if (!response.ok || payload.error) {
    const apiError = payload.error || {};
    throw new YoutubeApiError(
      apiError.message || "YouTube channel lookup failed",
      {
        statusCode: response.status || 502,
        code: apiError.code || apiError.status,
      }
    );
  }

  const channel = Array.isArray(payload.items) ? payload.items[0] : null;
  if (!channel) {
    throw new YoutubeApiError("No YouTube channel found for this Google account", {
      statusCode: 400,
      code: "NO_YOUTUBE_CHANNEL",
    });
  }

  return channel;
};

const mapChannelToSyncData = (channel, accessToken) => {
  const snippet = channel.snippet || {};
  const statistics = channel.statistics || {};
  const thumbnails = snippet.thumbnails || {};
  const profilePictureUrl =
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url;
  const channelName = snippet.title || "";
  const handle = (snippet.customUrl || channelName || "").replace(/^@/, "");

  return {
    accessToken,
    platformUserId: channel.id,
    youtubeChannelId: channel.id,
    handle,
    channelName,
    followers: Number(statistics.subscriberCount || 0),
    mediaCount: Number(statistics.videoCount || 0),
    accountType: "CHANNEL",
    profilePictureUrl,
    rawMetaPayload: { channel },
  };
};

const exchangeCodeAndSync = async ({ code }) => {
  const tokens = await exchangeCodeForTokens(code);
  const channel = await getMyChannel(tokens.access_token);
  const syncedData = mapChannelToSyncData(channel, tokens.access_token);
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + Number(tokens.expires_in) * 1000)
    : undefined;

  return {
    ...syncedData,
    encryptedToken: encryptToken(tokens.access_token),
    encryptedRefreshToken: tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : undefined,
    expiresAt,
  };
};

const getValidAccessToken = async ({
  encryptedToken,
  encryptedRefreshToken,
  tokenExpiresAt,
}) => {
  const currentToken = decryptToken(encryptedToken);
  const isExpired =
    tokenExpiresAt && new Date(tokenExpiresAt).getTime() - Date.now() < 60_000;

  if (!isExpired) {
    return { accessToken: currentToken };
  }

  if (!encryptedRefreshToken?.value) {
    return { accessToken: currentToken };
  }

  const refreshed = await refreshAccessToken(decryptToken(encryptedRefreshToken));

  return {
    accessToken: refreshed.access_token,
    expiresAt: refreshed.expires_in
      ? new Date(Date.now() + Number(refreshed.expires_in) * 1000)
      : tokenExpiresAt,
    encryptedToken: encryptToken(refreshed.access_token),
    encryptedRefreshToken: refreshed.refresh_token
      ? encryptToken(refreshed.refresh_token)
      : undefined,
  };
};

const syncWithStoredToken = async ({
  encryptedToken,
  encryptedRefreshToken,
  tokenExpiresAt,
}) => {
  const tokenState = await getValidAccessToken({
    encryptedToken,
    encryptedRefreshToken,
    tokenExpiresAt,
  });
  const channel = await getMyChannel(tokenState.accessToken);
  const syncedData = mapChannelToSyncData(channel, tokenState.accessToken);

  return {
    ...syncedData,
    expiresAt: tokenState.expiresAt,
    encryptedToken: tokenState.encryptedToken,
    encryptedRefreshToken: tokenState.encryptedRefreshToken,
  };
};

export {
  YoutubeApiError,
  YoutubeConfigError,
  buildConnectUrl,
  exchangeCodeAndSync,
  syncWithStoredToken,
  verifyStateToken,
};
