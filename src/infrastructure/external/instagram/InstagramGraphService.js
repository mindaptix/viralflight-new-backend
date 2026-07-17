import crypto from "crypto";
import jwt from "jsonwebtoken";

const DEFAULT_GRAPH_API_VERSION = "v23.0";
const DEFAULT_RECENT_MEDIA_LIMIT = 12;
const INSTAGRAM_SCOPES = [
  "instagram_basic",
  "pages_show_list",
  "pages_read_engagement",
  "instagram_manage_insights",
];

class InstagramConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "InstagramConfigError";
    this.statusCode = 503;
  }
}

class InstagramApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "InstagramApiError";
    this.statusCode = details.statusCode || 502;
    this.code = details.code;
    this.details = details;
  }
}

const getGraphApiVersion = () =>
  process.env.INSTAGRAM_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION;

const getGraphBaseUrl = () =>
  `https://graph.facebook.com/${getGraphApiVersion()}`;

const getRequiredEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new InstagramConfigError(`${key} is required for Instagram connect`);
  }

  return value;
};

const getRedirectUri = () =>
  getRequiredEnv("INSTAGRAM_REDIRECT_URI");

const getEncryptionKey = () => {
  const secret =
    process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    process.env.PAYLOAD_SECRET;

  if (!secret) {
    throw new InstagramConfigError(
      "INSTAGRAM_TOKEN_ENCRYPTION_KEY or JWT_SECRET is required"
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
    throw new InstagramConfigError("Instagram token is not available");
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

const buildStateToken = (user) =>
  jwt.sign(
    {
      userId: user.userId,
      mobile: user.mobile,
      role: user.role,
      nonce: crypto.randomBytes(12).toString("hex"),
    },
    getRequiredEnv("JWT_SECRET"),
    { expiresIn: "10m", audience: "instagram-oauth" }
  );

const verifyStateToken = (state) =>
  jwt.verify(state, getRequiredEnv("JWT_SECRET"), {
    audience: "instagram-oauth",
  });

const buildConnectUrl = (user) => {
  const params = new URLSearchParams({
    client_id: getRequiredEnv("INSTAGRAM_APP_ID"),
    redirect_uri: getRedirectUri(),
    state: buildStateToken(user),
    scope: INSTAGRAM_SCOPES.join(","),
    response_type: "code",
  });

  return `https://www.facebook.com/${getGraphApiVersion()}/dialog/oauth?${params.toString()}`;
};

const requestGraph = async (path, params = {}, options = {}) => {
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
    throw new InstagramApiError(
      apiError.message || "Instagram Graph API request failed",
      {
        statusCode: response.status,
        code: apiError.code || apiError.type,
        path,
        payload,
      }
    );
  }

  return payload;
};

const exchangeCodeForShortLivedToken = (code) =>
  requestGraph("/oauth/access_token", {
    client_id: getRequiredEnv("INSTAGRAM_APP_ID"),
    client_secret: getRequiredEnv("INSTAGRAM_APP_SECRET"),
    redirect_uri: getRedirectUri(),
    code,
  });

const exchangeForLongLivedToken = (shortLivedToken) =>
  requestGraph("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: getRequiredEnv("INSTAGRAM_APP_ID"),
    client_secret: getRequiredEnv("INSTAGRAM_APP_SECRET"),
    fb_exchange_token: shortLivedToken,
  });

const getPages = (accessToken) =>
  requestGraph("/me/accounts", {
    access_token: accessToken,
    fields:
      "id,name,access_token,instagram_business_account{id,username,followers_count,follows_count,media_count,profile_picture_url}",
    limit: 25,
  });

const getInstagramAccount = async (igUserId, accessToken) =>
  requestGraph(`/${igUserId}`, {
    access_token: accessToken,
    fields:
      "id,username,account_type,followers_count,follows_count,media_count,profile_picture_url",
  });

const getRecentMedia = async (igUserId, accessToken) =>
  requestGraph(`/${igUserId}/media`, {
    access_token: accessToken,
    fields: "id,like_count,comments_count,timestamp",
    limit: Number(process.env.INSTAGRAM_RECENT_MEDIA_LIMIT) || DEFAULT_RECENT_MEDIA_LIMIT,
  });

const calculateEngagementRate = (mediaItems, followers) => {
  if (!Array.isArray(mediaItems) || mediaItems.length === 0 || !followers) {
    return undefined;
  }

  const totalEngagement = mediaItems.reduce(
    (sum, item) => sum + Number(item.like_count || 0) + Number(item.comments_count || 0),
    0
  );

  return Number(((totalEngagement / mediaItems.length / followers) * 100).toFixed(2));
};

const pickInstagramPage = (pages, preferredHandle) => {
  const pageList = Array.isArray(pages?.data) ? pages.data : [];
  const connectedPages = pageList.filter((page) => page.instagram_business_account);

  if (connectedPages.length === 0) {
    throw new InstagramApiError(
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

const getSyncedInstagramData = async ({ accessToken, preferredHandle }) => {
  const pages = await getPages(accessToken);
  const page = pickInstagramPage(pages, preferredHandle);
  const pageToken = page.access_token || accessToken;
  const pageInstagramAccount = page.instagram_business_account;
  const account = await getInstagramAccount(pageInstagramAccount.id, pageToken);

  let engagementRate;
  try {
    const media = await getRecentMedia(account.id, pageToken);
    engagementRate = calculateEngagementRate(media.data, account.followers_count);
  } catch (error) {
    engagementRate = undefined;
  }

  return {
    accessToken: pageToken,
    facebookPageId: page.id,
    instagramUserId: account.id,
    handle: normalizeHandle(account.username),
    followers: Number(account.followers_count || 0),
    follows: Number(account.follows_count || 0),
    mediaCount: Number(account.media_count || 0),
    accountType: account.account_type,
    profilePictureUrl: account.profile_picture_url,
    engagementRate,
  };
};

const exchangeCodeAndSync = async ({ code, preferredHandle }) => {
  const shortLivedToken = await exchangeCodeForShortLivedToken(code);
  const longLivedToken = await exchangeForLongLivedToken(shortLivedToken.access_token);
  const expiresAt = longLivedToken.expires_in
    ? new Date(Date.now() + Number(longLivedToken.expires_in) * 1000)
    : undefined;
  const syncedData = await getSyncedInstagramData({
    accessToken: longLivedToken.access_token,
    preferredHandle,
  });

  return {
    ...syncedData,
    encryptedToken: encryptToken(syncedData.accessToken || longLivedToken.access_token),
    expiresAt,
  };
};

const syncWithStoredToken = async (encryptedToken, preferredHandle) =>
  getSyncedInstagramData({
    accessToken: decryptToken(encryptedToken),
    preferredHandle,
  });

export {
  InstagramApiError,
  InstagramConfigError,
  buildConnectUrl,
  decryptToken,
  encryptToken,
  exchangeCodeAndSync,
  normalizeHandle,
  syncWithStoredToken,
  verifyStateToken,
};
