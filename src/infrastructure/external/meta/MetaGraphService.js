import crypto from "crypto";
import jwt from "jsonwebtoken";

const DEFAULT_GRAPH_API_VERSION = "v21.0";
const DEFAULT_RECENT_MEDIA_LIMIT = 12;
const MAX_RETRIES = 3;

const INSTAGRAM_LOGIN_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_insights",
];

const INSTAGRAM_SCOPES = INSTAGRAM_LOGIN_SCOPES;

const FACEBOOK_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "read_insights",
  "business_management",
];

class MetaConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "MetaConfigError";
    this.statusCode = 503;
  }
}

class MetaApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "MetaApiError";
    this.statusCode = details.statusCode || 502;
    this.code = details.code;
    this.details = details;
  }
}

const getGraphApiVersion = () =>
  process.env.META_GRAPH_API_VERSION ||
  process.env.INSTAGRAM_GRAPH_API_VERSION ||
  DEFAULT_GRAPH_API_VERSION;

const getGraphBaseUrl = () =>
  `https://graph.facebook.com/${getGraphApiVersion()}`;

const getInstagramGraphBaseUrl = () =>
  `https://graph.instagram.com/${getGraphApiVersion()}`;

const getMetaAppId = () =>
  process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID;

const getMetaAppSecret = () =>
  process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET;

const getRequiredEnv = (resolver, label) => {
  const value = resolver();
  if (!value) {
    throw new MetaConfigError(`${label} is required for Meta OAuth`);
  }
  return value;
};

const trimEnv = (value) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
};

const getPublicBaseUrl = () => {
  const raw =
    trimEnv(process.env.PUBLIC_APP_URL) ||
    trimEnv(process.env.APP_BASE_URL) ||
    "https://viralflight.cloud";
  return raw.replace(/\/$/, "");
};

const getRedirectUri = (platform) => {
  const explicit =
    platform === "instagram"
      ? trimEnv(process.env.META_REDIRECT_URI_INSTAGRAM) ||
        trimEnv(process.env.INSTAGRAM_REDIRECT_URI)
      : trimEnv(process.env.META_REDIRECT_URI_FACEBOOK) ||
        trimEnv(process.env.FACEBOOK_REDIRECT_URI);

  if (explicit) {
    return explicit;
  }

  return `${getPublicBaseUrl()}/api/influencer/${platform}/callback`;
};

const getEncryptionKey = () => {
  const secret =
    process.env.META_TOKEN_ENCRYPTION_KEY ||
    process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    process.env.PAYLOAD_SECRET;

  if (!secret) {
    throw new MetaConfigError(
      "META_TOKEN_ENCRYPTION_KEY or JWT_SECRET is required"
    );
  }

  if (/^[a-f0-9]{64}$/i.test(secret)) {
    return Buffer.from(secret, "hex");
  }

  return crypto.createHash("sha256").update(secret).digest();
};

const encryptToken = (plainTextToken) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const value = Buffer.concat([
    cipher.update(plainTextToken, "utf8"),
    cipher.final(),
  ]);

  return {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    value: value.toString("base64"),
  };
};

const decryptToken = (encryptedToken) => {
  if (!encryptedToken?.iv || !encryptedToken?.tag || !encryptedToken?.value) {
    throw new MetaConfigError("Meta access token is not available");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(encryptedToken.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(encryptedToken.tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedToken.value, "base64")),
    decipher.final(),
  ]).toString("utf8");
};

const normalizeHandle = (handle) =>
  typeof handle === "string"
    ? handle.trim().replace(/^@/, "").toLowerCase()
    : undefined;

const buildStateToken = (user, platform) =>
  jwt.sign(
    {
      userId: user.userId,
      mobile: user.mobile,
      role: user.role,
      platform,
      nonce: crypto.randomBytes(12).toString("hex"),
    },
    getRequiredEnv(() => process.env.JWT_SECRET, "JWT_SECRET"),
    { expiresIn: "10m", audience: `${platform}-oauth` }
  );

const verifyStateToken = (state, platform) => {
  const decoded = jwt.verify(
    state,
    getRequiredEnv(() => process.env.JWT_SECRET, "JWT_SECRET"),
    { audience: `${platform}-oauth` }
  );

  if (decoded.platform && decoded.platform !== platform) {
    throw new MetaApiError("OAuth state platform mismatch", {
      statusCode: 400,
      code: "INVALID_OAUTH_STATE",
    });
  }

  return decoded;
};

const buildConnectUrl = (user, platform) => {
  const redirectUri = getRedirectUri(platform);
  const clientId = getRequiredEnv(getMetaAppId, "META_APP_ID");
  const state = buildStateToken(user, platform);

  if (platform === "instagram") {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope: INSTAGRAM_LOGIN_SCOPES.join(","),
      response_type: "code",
      enable_fb_login: "0",
    });

    return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: FACEBOOK_SCOPES.join(","),
    response_type: "code",
  });

  return `https://www.facebook.com/${getGraphApiVersion()}/dialog/oauth?${params.toString()}`;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const requestGraph = async (path, params = {}, options = {}, attempt = 1) => {
  const url = new URL(`${getGraphBaseUrl()}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    method: options.method || "GET",
    headers: options.headers,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.error) {
    const apiError = payload.error || {};
    const isRateLimited =
      apiError.code === 4 ||
      apiError.code === 17 ||
      apiError.code === 32 ||
      response.status === 429;

    if (isRateLimited && attempt < MAX_RETRIES) {
      await sleep(2 ** attempt * 500);
      return requestGraph(path, params, options, attempt + 1);
    }

    throw new MetaApiError(
      apiError.message || "Meta Graph API request failed",
      {
        statusCode: response.status,
        code: apiError.code || apiError.type,
        path,
      }
    );
  }

  return payload;
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

const extractInstagramAccessToken = (payload) => {
  if (payload?.access_token) {
    return {
      access_token: payload.access_token,
      user_id: payload.user_id || payload.user?.id,
      expires_in: payload.expires_in,
    };
  }

  const first = Array.isArray(payload?.data) ? payload.data[0] : null;
  if (first?.access_token) {
    return {
      access_token: first.access_token,
      user_id: first.user_id,
      expires_in: first.expires_in,
    };
  }

  return null;
};

const exchangeInstagramLoginCode = async (code) => {
  const body = new URLSearchParams({
    client_id: getRequiredEnv(getMetaAppId, "META_APP_ID"),
    client_secret: getRequiredEnv(getMetaAppSecret, "META_APP_SECRET"),
    grant_type: "authorization_code",
    redirect_uri: getRedirectUri("instagram"),
    code,
  });

  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await parseJsonSafe(response);
  const token = extractInstagramAccessToken(payload);

  if (!response.ok || payload.error || payload.error_type || !token) {
    const apiError = payload.error || payload;
    throw new MetaApiError(
      apiError.error_message ||
        apiError.message ||
        "Instagram Login token exchange failed",
      {
        statusCode: response.status || 502,
        code: apiError.code || apiError.error_type,
      }
    );
  }

  return token;
};

const exchangeCodeForShortLivedToken = (code, platform) =>
  requestGraph("/oauth/access_token", {
    client_id: getRequiredEnv(getMetaAppId, "META_APP_ID"),
    client_secret: getRequiredEnv(getMetaAppSecret, "META_APP_SECRET"),
    redirect_uri: getRedirectUri(platform),
    code,
  });

const exchangeForLongLivedToken = (shortLivedToken) =>
  requestGraph("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: getRequiredEnv(getMetaAppId, "META_APP_ID"),
    client_secret: getRequiredEnv(getMetaAppSecret, "META_APP_SECRET"),
    fb_exchange_token: shortLivedToken,
  });

const requestInstagramGraph = async (path, params = {}, options = {}, attempt = 1) => {
  const url = new URL(`${getInstagramGraphBaseUrl()}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const headers = { ...(options.headers || {}) };
  if (params.access_token && !headers.Authorization) {
    headers.Authorization = `Bearer ${params.access_token}`;
  }

  const response = await fetch(url, {
    method: options.method || "GET",
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });
  const payload = await parseJsonSafe(response);

  if (!response.ok || payload.error) {
    const apiError = payload.error || {};
    const isRateLimited =
      apiError.code === 4 ||
      apiError.code === 17 ||
      apiError.code === 32 ||
      response.status === 429;

    if (isRateLimited && attempt < MAX_RETRIES) {
      await sleep(2 ** attempt * 500);
      return requestInstagramGraph(path, params, attempt + 1);
    }

    throw new MetaApiError(
      apiError.message || "Instagram Graph API request failed",
      {
        statusCode: response.status,
        code: apiError.code || apiError.type,
        path,
      }
    );
  }

  return payload;
};

const requestInstagramUnversioned = async (path, params = {}) => {
  const url = new URL(`https://graph.instagram.com${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url);
  const payload = await parseJsonSafe(response);

  if (!response.ok || payload.error) {
    const apiError = payload.error || {};
    throw new MetaApiError(
      apiError.message || "Instagram Graph API request failed",
      {
        statusCode: response.status,
        code: apiError.code || apiError.type,
        path,
      }
    );
  }

  return payload;
};

const exchangeInstagramForLongLivedToken = async (shortLivedToken) => {
  const payload = await requestInstagramUnversioned("/access_token", {
    grant_type: "ig_exchange_token",
    client_secret: getRequiredEnv(getMetaAppSecret, "META_APP_SECRET"),
    access_token: shortLivedToken,
  });

  return {
    access_token: payload.access_token,
    expires_in: payload.expires_in,
  };
};

const refreshInstagramLongLivedToken = (accessToken) =>
  requestInstagramUnversioned("/refresh_access_token", {
    grant_type: "ig_refresh_token",
    access_token: accessToken,
  });

const refreshLongLivedTokenIfNeeded = async (
  accessToken,
  expiresAt,
  platform
) => {
  if (!expiresAt) {
    return { accessToken, expiresAt: undefined };
  }

  const expiresInMs = new Date(expiresAt).getTime() - Date.now();
  if (expiresInMs > 7 * 24 * 60 * 60 * 1000) {
    return { accessToken, expiresAt };
  }

  if (platform === "instagram") {
    try {
      const refreshed = await refreshInstagramLongLivedToken(accessToken);
      return {
        accessToken: refreshed.access_token,
        expiresAt: refreshed.expires_in
          ? new Date(Date.now() + Number(refreshed.expires_in) * 1000)
          : expiresAt,
      };
    } catch (error) {
      // Legacy Facebook Login tokens still use fb_exchange_token.
    }
  }

  const refreshed = await exchangeForLongLivedToken(accessToken);
  return {
    accessToken: refreshed.access_token,
    expiresAt: refreshed.expires_in
      ? new Date(Date.now() + Number(refreshed.expires_in) * 1000)
      : expiresAt,
  };
};

const getPages = (accessToken) =>
  requestGraph("/me/accounts", {
    access_token: accessToken,
    fields:
      "id,name,access_token,fan_count,followers_count,picture{url},instagram_business_account{id,username,followers_count,follows_count,media_count,profile_picture_url}",
    limit: 25,
  });

const getInstagramLoginProfile = async (accessToken) => {
  try {
    return await requestInstagramGraph("/me", {
      access_token: accessToken,
      fields:
        "id,user_id,username,account_type,followers_count,follows_count,media_count,profile_picture_url",
    }, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    // Fallback if extended fields fail on basic display or specific account configurations
    return await requestInstagramGraph("/me", {
      access_token: accessToken,
      fields: "id,username,followers_count",
    }, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
};

const getInstagramAccount = async (igUserId, accessToken) =>
  requestGraph(`/${igUserId}`, {
    access_token: accessToken,
    fields:
      "id,username,account_type,followers_count,follows_count,media_count,profile_picture_url",
  });

const getRecentInstagramLoginMedia = async (igUserId, accessToken) =>
  requestInstagramGraph(`/${igUserId}/media`, {
    access_token: accessToken,
    fields: "id,like_count,comments_count,timestamp",
    limit:
      Number(process.env.INSTAGRAM_RECENT_MEDIA_LIMIT) ||
      DEFAULT_RECENT_MEDIA_LIMIT,
  });

const getRecentMedia = async (igUserId, accessToken) =>
  requestGraph(`/${igUserId}/media`, {
    access_token: accessToken,
    fields: "id,like_count,comments_count,timestamp",
    limit:
      Number(process.env.INSTAGRAM_RECENT_MEDIA_LIMIT) ||
      DEFAULT_RECENT_MEDIA_LIMIT,
  });

const getInstagramLoginInsights = async (igUserId, accessToken) => {
  try {
    const insights = await requestInstagramGraph(`/${igUserId}/insights`, {
      access_token: accessToken,
      metric: "impressions,reach,profile_views",
      period: "day",
    });

    const metrics = Array.isArray(insights.data) ? insights.data : [];
    const impressionsMetric = metrics.find(
      (item) => item.name === "impressions"
    );
    const reachMetric = metrics.find((item) => item.name === "reach");

    if (impressionsMetric?.values?.length && reachMetric?.values?.length) {
      const recentImpressions = impressionsMetric.values
        .slice(-30)
        .reduce((sum, item) => sum + Number(item.value || 0), 0);
      const recentReach = reachMetric.values
        .slice(-30)
        .reduce((sum, item) => sum + Number(item.value || 0), 0);

      if (recentImpressions > 0) {
        return Number(((recentReach / recentImpressions) * 100).toFixed(2));
      }
    }
  } catch (error) {
    // Fall back to media-based engagement.
  }

  return undefined;
};

const getInstagramInsights = async (igUserId, accessToken) => {
  try {
    const insights = await requestGraph(`/${igUserId}/insights`, {
      access_token: accessToken,
      metric: "impressions,reach,engagement",
      period: "day",
    });

    const metrics = Array.isArray(insights.data) ? insights.data : [];
    const engagementMetric = metrics.find((item) => item.name === "engagement");
    const impressionsMetric = metrics.find(
      (item) => item.name === "impressions"
    );

    if (engagementMetric?.values?.length && impressionsMetric?.values?.length) {
      const recentEngagement = engagementMetric.values
        .slice(-30)
        .reduce((sum, item) => sum + Number(item.value || 0), 0);
      const recentImpressions = impressionsMetric.values
        .slice(-30)
        .reduce((sum, item) => sum + Number(item.value || 0), 0);

      if (recentImpressions > 0) {
        return Number(
          ((recentEngagement / recentImpressions) * 100).toFixed(2)
        );
      }
    }
  } catch (error) {
    // Fall back to media-based engagement.
  }

  return undefined;
};

const calculateEngagementRateFromMedia = (mediaItems, followers) => {
  if (!Array.isArray(mediaItems) || mediaItems.length === 0 || !followers) {
    return undefined;
  }

  const totalEngagement = mediaItems.reduce(
    (sum, item) =>
      sum + Number(item.like_count || 0) + Number(item.comments_count || 0),
    0
  );

  return Number(
    ((totalEngagement / mediaItems.length / followers) * 100).toFixed(2)
  );
};

const pickInstagramPage = (pages, preferredHandle) => {
  const pageList = Array.isArray(pages?.data) ? pages.data : [];
  const connectedPages = pageList.filter(
    (page) => page.instagram_business_account
  );

  if (connectedPages.length === 0) {
    throw new MetaApiError(
      "No Instagram Business or Creator account found on connected Facebook Pages",
      { statusCode: 400, code: "NO_IG_BUSINESS_ACCOUNT" }
    );
  }

  const normalizedPreferredHandle = normalizeHandle(preferredHandle);
  if (normalizedPreferredHandle) {
    const match = connectedPages.find(
      (page) =>
        normalizeHandle(page.instagram_business_account?.username) ===
        normalizedPreferredHandle
    );

    if (match) return match;
  }

  return connectedPages[0];
};

const pickFacebookPage = (pages) => {
  const pageList = Array.isArray(pages?.data) ? pages.data : [];

  if (pageList.length === 0) {
    throw new MetaApiError(
      "No Facebook Pages found for this account",
      { statusCode: 400, code: "NO_FACEBOOK_PAGE" }
    );
  }

  return pageList[0];
};

const getFacebookPageDetails = async (pageId, pageToken) =>
  requestGraph(`/${pageId}`, {
    access_token: pageToken,
    fields: "id,name,followers_count,fan_count,picture{url}",
  });

const getFacebookPagePosts = async (pageId, pageToken) =>
  requestGraph(`/${pageId}/posts`, {
    access_token: pageToken,
    fields: "id",
    limit: 100,
  });

const getFacebookPageInsights = async (pageId, pageToken) => {
  try {
    const insights = await requestGraph(`/${pageId}/insights`, {
      access_token: pageToken,
      metric: "page_post_engagements,page_impressions",
      period: "day",
    });

    const metrics = Array.isArray(insights.data) ? insights.data : [];
    const engagements = metrics.find(
      (item) => item.name === "page_post_engagements"
    );
    const impressions = metrics.find(
      (item) => item.name === "page_impressions"
    );

    if (engagements?.values?.length && impressions?.values?.length) {
      const recentEngagements = engagements.values
        .slice(-30)
        .reduce((sum, item) => sum + Number(item.value || 0), 0);
      const recentImpressions = impressions.values
        .slice(-30)
        .reduce((sum, item) => sum + Number(item.value || 0), 0);

      if (recentImpressions > 0) {
        return Number(
          ((recentEngagements / recentImpressions) * 100).toFixed(2)
        );
      }
    }
  } catch (error) {
    // Insights may be unavailable for some pages.
  }

  return undefined;
};

const mapInstagramAccountToSyncData = async ({
  account,
  accessToken,
  facebookPageId,
  rawMetaPayload,
  fetchInsights,
  fetchMedia,
}) => {
  const igUserId = account.user_id || account.id;
  let engagementRate = await fetchInsights(igUserId, accessToken);

  if (engagementRate === undefined) {
    try {
      const media = await fetchMedia(igUserId, accessToken);
      engagementRate = calculateEngagementRateFromMedia(
        media.data,
        account.followers_count
      );
    } catch (error) {
      engagementRate = undefined;
    }
  }

  return {
    accessToken,
    platformUserId: String(igUserId),
    facebookPageId,
    handle: normalizeHandle(account.username),
    followers: Number(account.followers_count || 0),
    follows: Number(account.follows_count || 0),
    mediaCount: Number(account.media_count || 0),
    accountType: account.account_type || "CREATOR",
    profilePictureUrl: account.profile_picture_url,
    engagementRate,
    rawMetaPayload,
  };
};

const syncInstagramViaLogin = async (accessToken) => {
  const account = await getInstagramLoginProfile(accessToken);

  return mapInstagramAccountToSyncData({
    account,
    accessToken,
    facebookPageId: undefined,
    rawMetaPayload: { account, authType: "instagram_login" },
    fetchInsights: getInstagramLoginInsights,
    fetchMedia: getRecentInstagramLoginMedia,
  });
};

const syncInstagramViaFacebookPages = async ({
  accessToken,
  preferredHandle,
}) => {
  const pages = await getPages(accessToken);
  const page = pickInstagramPage(pages, preferredHandle);
  const pageToken = page.access_token || accessToken;
  const pageInstagramAccount = page.instagram_business_account;
  const account = await getInstagramAccount(pageInstagramAccount.id, pageToken);

  return mapInstagramAccountToSyncData({
    account,
    accessToken: pageToken,
    facebookPageId: page.id,
    rawMetaPayload: {
      account,
      page: { id: page.id, name: page.name },
      authType: "facebook_login",
    },
    fetchInsights: getInstagramInsights,
    fetchMedia: getRecentMedia,
  });
};

const syncInstagramData = async ({ accessToken, preferredHandle }) => {
  try {
    return await syncInstagramViaLogin(accessToken);
  } catch (error) {
    return syncInstagramViaFacebookPages({ accessToken, preferredHandle });
  }
};

const syncFacebookData = async ({ accessToken }) => {
  const pages = await getPages(accessToken);
  const page = pickFacebookPage(pages);
  const pageToken = page.access_token || accessToken;
  const pageDetails = await getFacebookPageDetails(page.id, pageToken);

  let mediaCount = 0;
  try {
    const posts = await getFacebookPagePosts(page.id, pageToken);
    mediaCount = Array.isArray(posts.data) ? posts.data.length : 0;
  } catch (error) {
    mediaCount = 0;
  }

  const followers = Number(
    pageDetails.followers_count || pageDetails.fan_count || page.followers_count || page.fan_count || 0
  );
  const likes = Number(pageDetails.fan_count || followers);
  let engagementRate = await getFacebookPageInsights(page.id, pageToken);

  return {
    accessToken: pageToken,
    platformUserId: pageDetails.id,
    facebookPageId: pageDetails.id,
    handle: pageDetails.name,
    pageName: pageDetails.name,
    followers,
    likes,
    mediaCount,
    accountType: "PAGE",
    profilePictureUrl: pageDetails.picture?.data?.url || pageDetails.picture?.url,
    engagementRate,
    rawMetaPayload: { page: pageDetails },
  };
};

const exchangeInstagramCodeAndToken = async (code) => {
  try {
    const shortLivedToken = await exchangeInstagramLoginCode(code);
    let longLivedToken = shortLivedToken;

    try {
      longLivedToken = await exchangeInstagramForLongLivedToken(
        shortLivedToken.access_token
      );
    } catch (error) {
      longLivedToken = shortLivedToken;
    }

    return {
      access_token: longLivedToken.access_token,
      expires_in: longLivedToken.expires_in,
    };
  } catch (instagramLoginError) {
    const shortLivedToken = await exchangeCodeForShortLivedToken(
      code,
      "instagram"
    );
    const longLivedToken = await exchangeForLongLivedToken(
      shortLivedToken.access_token
    );

    return {
      access_token: longLivedToken.access_token,
      expires_in: longLivedToken.expires_in,
    };
  }
};

const exchangeCodeAndSync = async ({ code, platform, preferredHandle }) => {
  let accessToken;
  let expiresIn;

  if (platform === "instagram") {
    const token = await exchangeInstagramCodeAndToken(code);
    accessToken = token.access_token;
    expiresIn = token.expires_in;
  } else {
    const shortLivedToken = await exchangeCodeForShortLivedToken(code, platform);
    const longLivedToken = await exchangeForLongLivedToken(
      shortLivedToken.access_token
    );
    accessToken = longLivedToken.access_token;
    expiresIn = longLivedToken.expires_in;
  }

  const expiresAt = expiresIn
    ? new Date(Date.now() + Number(expiresIn) * 1000)
    : undefined;

  const syncFn = platform === "instagram" ? syncInstagramData : syncFacebookData;
  const syncedData = await syncFn({
    accessToken,
    preferredHandle,
  });

  return {
    ...syncedData,
    encryptedToken: encryptToken(syncedData.accessToken || accessToken),
    expiresAt,
  };
};

const syncWithStoredToken = async ({
  encryptedToken,
  tokenExpiresAt,
  platform,
  preferredHandle,
}) => {
  const originalToken = decryptToken(encryptedToken);
  const refreshed = await refreshLongLivedTokenIfNeeded(
    originalToken,
    tokenExpiresAt,
    platform
  );
  const accessToken = refreshed.accessToken;

  const syncFn = platform === "instagram" ? syncInstagramData : syncFacebookData;
  const syncedData = await syncFn({ accessToken, preferredHandle });

  return {
    ...syncedData,
    accessToken,
    expiresAt: refreshed.expiresAt,
    encryptedToken:
      refreshed.accessToken !== originalToken
        ? encryptToken(refreshed.accessToken)
        : undefined,
  };
};

export {
  MetaApiError,
  MetaConfigError,
  buildConnectUrl,
  buildStateToken,
  decryptToken,
  encryptToken,
  exchangeCodeAndSync,
  normalizeHandle,
  syncWithStoredToken,
  verifyStateToken,
  INSTAGRAM_SCOPES,
  INSTAGRAM_LOGIN_SCOPES,
  FACEBOOK_SCOPES,
};
