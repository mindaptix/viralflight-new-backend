import crypto from "crypto";
import jwt from "jsonwebtoken";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";
const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

class YoutubeConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "YoutubeConfigError";
    this.statusCode = 503;
    this.code = "YOUTUBE_CONFIG_ERROR";
  }
}

class YoutubeApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "YoutubeApiError";
    this.statusCode = details.statusCode || 502;
    this.code = details.code || "YOUTUBE_API_ERROR";
  }
}

const required = (value, name) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new YoutubeConfigError(`${name} is required`);
  return normalized;
};

const getClientId = () =>
  required(
    process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
    "YOUTUBE_CLIENT_ID or GOOGLE_CLIENT_ID"
  );

const getClientSecret = () =>
  required(
    process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    "YOUTUBE_CLIENT_SECRET or GOOGLE_CLIENT_SECRET"
  );

const getRedirectUri = () => {
  const explicit = process.env.YOUTUBE_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const base = (
    process.env.PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    "https://viralflight.cloud"
  ).replace(/\/$/, "");
  return `${base}/api/v1/influencer/youtube/callback`;
};

const getEncryptionKey = () => {
  const secret =
    process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY ||
    process.env.META_TOKEN_ENCRYPTION_KEY ||
    process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    process.env.PAYLOAD_SECRET;
  if (!secret) throw new YoutubeConfigError("Token encryption key is required");
  return /^[a-f0-9]{64}$/i.test(secret)
    ? Buffer.from(secret, "hex")
    : crypto.createHash("sha256").update(secret).digest();
};

const encryptToken = (plainText) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const value = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  return {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    value: value.toString("base64"),
  };
};

const decryptToken = (encrypted) => {
  if (!encrypted?.iv || !encrypted?.tag || !encrypted?.value) {
    throw new YoutubeConfigError("YouTube token is not available");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(encrypted.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(encrypted.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.value, "base64")),
    decipher.final(),
  ]).toString("utf8");
};

const parseResponse = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const requestToken = async (body) => {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const payload = await parseResponse(response);
  if (!response.ok || payload.error) {
    throw new YoutubeApiError(
      payload.error_description || payload.error || "Google token request failed",
      { statusCode: response.status, code: payload.error }
    );
  }
  return payload;
};

const fetchChannel = async (accessToken) => {
  const url = new URL(CHANNELS_URL);
  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set("mine", "true");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = await parseResponse(response);
  if (!response.ok || payload.error) {
    throw new YoutubeApiError(
      payload.error?.message || "Unable to fetch YouTube channel",
      { statusCode: response.status, code: payload.error?.status }
    );
  }
  const channel = payload.items?.[0];
  if (!channel) {
    throw new YoutubeApiError("No YouTube channel was found for this account", {
      statusCode: 400,
      code: "NO_YOUTUBE_CHANNEL",
    });
  }
  return channel;
};

const mapChannel = (channel, accessToken) => ({
  accessToken,
  platformUserId: String(channel.id),
  youtubeChannelId: String(channel.id),
  handle: channel.snippet?.customUrl || channel.snippet?.title || "",
  channelName: channel.snippet?.title || channel.snippet?.customUrl || "",
  followers: Number(channel.statistics?.subscriberCount || 0),
  views: Number(channel.statistics?.viewCount || 0),
  videoCount: Number(channel.statistics?.videoCount || 0),
  mediaCount: Number(channel.statistics?.videoCount || 0),
  profilePictureUrl:
    channel.snippet?.thumbnails?.high?.url ||
    channel.snippet?.thumbnails?.default?.url,
  accountType: "CHANNEL",
  rawMetaPayload: { channel },
});

const buildStateToken = (user) =>
  jwt.sign(
    {
      userId: user.userId,
      mobile: user.mobile,
      role: user.role,
      platform: "youtube",
      nonce: crypto.randomBytes(12).toString("hex"),
    },
    required(process.env.JWT_SECRET, "JWT_SECRET"),
    { expiresIn: "10m", audience: "youtube-oauth" }
  );

const verifyStateToken = (state) =>
  jwt.verify(state, required(process.env.JWT_SECRET, "JWT_SECRET"), {
    audience: "youtube-oauth",
  });

const buildConnectUrl = (user) => {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: buildStateToken(user),
  });
  return `${AUTH_URL}?${params.toString()}`;
};

const exchangeCodeAndSync = async ({ code }) => {
  const token = await requestToken({
    code,
    client_id: getClientId(),
    client_secret: getClientSecret(),
    redirect_uri: getRedirectUri(),
    grant_type: "authorization_code",
  });
  const channel = await fetchChannel(token.access_token);
  return {
    ...mapChannel(channel, token.access_token),
    encryptedToken: encryptToken(token.access_token),
    encryptedRefreshToken: token.refresh_token
      ? encryptToken(token.refresh_token)
      : undefined,
    expiresAt: token.expires_in
      ? new Date(Date.now() + Number(token.expires_in) * 1000)
      : undefined,
  };
};

const syncWithStoredToken = async ({
  encryptedToken,
  encryptedRefreshToken,
  tokenExpiresAt,
}) => {
  let accessToken = decryptToken(encryptedToken);
  let refreshed;
  const expiresAt = tokenExpiresAt ? new Date(tokenExpiresAt).getTime() : 0;
  if (expiresAt && expiresAt <= Date.now() + 60_000) {
    const refreshToken = decryptToken(encryptedRefreshToken);
    refreshed = await requestToken({
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: "refresh_token",
    });
    accessToken = refreshed.access_token;
  }
  const channel = await fetchChannel(accessToken);
  return {
    ...mapChannel(channel, accessToken),
    encryptedToken: refreshed ? encryptToken(accessToken) : undefined,
    expiresAt: refreshed?.expires_in
      ? new Date(Date.now() + Number(refreshed.expires_in) * 1000)
      : tokenExpiresAt,
  };
};

const revokeStoredToken = async ({ encryptedToken, encryptedRefreshToken }) => {
  const encrypted = encryptedRefreshToken?.value
    ? encryptedRefreshToken
    : encryptedToken;
  if (!encrypted?.value) return;
  const token = decryptToken(encrypted);
  const response = await fetch(REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  });
  if (!response.ok) {
    throw new YoutubeApiError("Unable to revoke Google authorization", {
      statusCode: response.status,
      code: "TOKEN_REVOKE_FAILED",
    });
  }
};

export {
  SCOPES,
  YoutubeApiError,
  YoutubeConfigError,
  buildConnectUrl,
  decryptToken,
  encryptToken,
  exchangeCodeAndSync,
  getRedirectUri,
  revokeStoredToken,
  syncWithStoredToken,
  verifyStateToken,
};
