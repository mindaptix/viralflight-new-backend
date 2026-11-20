import crypto from "crypto";
import jwt from "jsonwebtoken";
import oauthCache from "../../cache/cacheService.js";

const AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const REVOKE_URL = "https://api.twitter.com/2/oauth2/revoke";
const USER_ME_URL =
  "https://api.twitter.com/2/users/me?user.fields=public_metrics,profile_image_url,verified";
const SCOPES = ["tweet.read", "users.read", "offline.access"];

class XConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "XConfigError";
    this.statusCode = 503;
    this.code = "X_CONFIG_ERROR";
  }
}

class XApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "XApiError";
    this.statusCode = details.statusCode || 502;
    this.code = details.code || "X_API_ERROR";
  }
}

const required = (value, name) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new XConfigError(`${name} is required`);
  return normalized;
};

const getClientId = () =>
  required(
    process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID,
    "X_CLIENT_ID or TWITTER_CLIENT_ID"
  );

const getClientSecret = () =>
  process.env.X_CLIENT_SECRET || process.env.TWITTER_CLIENT_SECRET || "";

const getRedirectUri = () => {
  const explicit = (
    process.env.X_REDIRECT_URI || process.env.TWITTER_REDIRECT_URI
  )?.trim();
  if (explicit) return explicit;
  const base = (
    process.env.PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    "https://viralflight.cloud"
  ).replace(/\/$/, "");
  return `${base}/api/v1/influencer/x/callback`;
};

const getEncryptionKey = () => {
  const secret =
    process.env.X_TOKEN_ENCRYPTION_KEY ||
    process.env.TWITTER_TOKEN_ENCRYPTION_KEY ||
    process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY ||
    process.env.META_TOKEN_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    process.env.PAYLOAD_SECRET;
  if (!secret) throw new XConfigError("Token encryption key is required");
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
    throw new XConfigError("X token is not available");
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

const generateCodeVerifier = () =>
  crypto.randomBytes(48).toString("base64url");

const generateCodeChallenge = (verifier) =>
  crypto.createHash("sha256").update(verifier).digest("base64url");

const buildConnectUrl = (user) => {
  const state = crypto.randomBytes(24).toString("hex");
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Save code_verifier, state, and influencer ID in cache with 10-minute TTL
  oauthCache.set(
    `x_state:${state}`,
    {
      userId: user.userId || user.id || user._id,
      mobile: user.mobile,
      role: user.role,
      codeVerifier,
    },
    600
  );

  const params = new URLSearchParams({
    response_type: "code",
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    scope: SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${AUTH_URL}?${params.toString()}`;
};

const getStateData = (state) => {
  const cached = oauthCache.get(`x_state:${state}`);
  if (!cached) {
    throw new XApiError("Invalid or expired OAuth state", {
      statusCode: 400,
      code: "INVALID_STATE",
    });
  }
  return cached;
};

const exchangeCodeAndSync = async ({ code, state }) => {
  const stateData = getStateData(state);
  const { codeVerifier, userId } = stateData;

  const clientId = getClientId();
  const clientSecret = getClientSecret();

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const bodyParams = {
    code,
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    code_verifier: codeVerifier,
  };

  if (clientSecret) {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64"
    );
    headers["Authorization"] = `Basic ${credentials}`;
  }

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers,
    body: new URLSearchParams(bodyParams),
  });

  const tokenData = await parseResponse(tokenRes);
  if (!tokenRes.ok || tokenData.error) {
    throw new XApiError(
      tokenData.error_description || tokenData.error || "X token exchange failed",
      { statusCode: tokenRes.status, code: tokenData.error }
    );
  }

  // Fetch X user profile
  const userRes = await fetch(USER_ME_URL, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  const userData = await parseResponse(userRes);
  if (!userRes.ok || userData.errors || !userData.data) {
    const errMsg =
      userData.errors?.[0]?.message ||
      userData.detail ||
      "Unable to fetch X profile";
    throw new XApiError(errMsg, {
      statusCode: userRes.status,
      code: "X_PROFILE_ERROR",
    });
  }

  const userInfo = userData.data;
  const metrics = userInfo.public_metrics || {};

  // Clean up state from cache after successful exchange
  oauthCache.del(`x_state:${state}`);

  return {
    userId,
    platformUserId: userInfo.id,
    handle: userInfo.username,
    name: userInfo.name,
    followers_count: Number(metrics.followers_count || 0),
    following_count: Number(metrics.following_count || 0),
    tweet_count: Number(metrics.tweet_count || 0),
    profile_image_url: userInfo.profile_image_url || "",
    verified: Boolean(userInfo.verified),
    encryptedToken: encryptToken(tokenData.access_token),
    encryptedRefreshToken: tokenData.refresh_token
      ? encryptToken(tokenData.refresh_token)
      : undefined,
    expiresAt: tokenData.expires_in
      ? new Date(Date.now() + Number(tokenData.expires_in) * 1000)
      : undefined,
  };
};

const revokeStoredToken = async ({ encryptedToken, encryptedRefreshToken }) => {
  const encrypted = encryptedRefreshToken?.value
    ? encryptedRefreshToken
    : encryptedToken;
  if (!encrypted?.value) return;
  const token = decryptToken(encrypted);
  const clientId = getClientId();
  const clientSecret = getClientSecret();

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (clientSecret) {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64"
    );
    headers["Authorization"] = `Basic ${credentials}`;
  }

  try {
    await fetch(REVOKE_URL, {
      method: "POST",
      headers,
      body: new URLSearchParams({
        token,
        client_id: clientId,
        token_type_hint: encryptedRefreshToken?.value
          ? "refresh_token"
          : "access_token",
      }),
    });
  } catch (err) {
    console.warn("[x] X token revocation warning:", err.message);
  }
};

export {
  SCOPES,
  XApiError,
  XConfigError,
  buildConnectUrl,
  decryptToken,
  encryptToken,
  exchangeCodeAndSync,
  generateCodeChallenge,
  generateCodeVerifier,
  getClientId,
  getRedirectUri,
  getStateData,
  revokeStoredToken,
};
