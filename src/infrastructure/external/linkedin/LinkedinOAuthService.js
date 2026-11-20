import crypto from "crypto";
import jwt from "jsonwebtoken";
import oauthCache from "../../cache/cacheService.js";

const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USER_INFO_URL = "https://api.linkedin.com/v2/userinfo";
const SCOPES = ["openid", "profile", "email"];

class LinkedinConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "LinkedinConfigError";
    this.statusCode = 503;
    this.code = "LINKEDIN_CONFIG_ERROR";
  }
}

class LinkedinApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "LinkedinApiError";
    this.statusCode = details.statusCode || 502;
    this.code = details.code || "LINKEDIN_API_ERROR";
  }
}

const required = (value, name) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new LinkedinConfigError(`${name} is required`);
  return normalized;
};

const getClientId = () =>
  required(
    process.env.LINKEDIN_CLIENT_ID || process.env.LINKEDIN_API_KEY,
    "LINKEDIN_CLIENT_ID or LINKEDIN_API_KEY"
  );

const getClientSecret = () =>
  required(
    process.env.LINKEDIN_CLIENT_SECRET || process.env.LINKEDIN_SECRET_KEY,
    "LINKEDIN_CLIENT_SECRET"
  );

const getRedirectUri = () => {
  const explicit = process.env.LINKEDIN_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const base = (
    process.env.PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    "https://viralflight.cloud"
  ).replace(/\/$/, "");
  return `${base}/api/v1/influencer/linkedin/callback`;
};

const getEncryptionKey = () => {
  const secret =
    process.env.LINKEDIN_TOKEN_ENCRYPTION_KEY ||
    process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY ||
    process.env.META_TOKEN_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    process.env.PAYLOAD_SECRET;
  if (!secret) throw new LinkedinConfigError("Token encryption key is required");
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
    throw new LinkedinConfigError("LinkedIn token is not available");
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

const buildConnectUrl = (user) => {
  const state = crypto.randomBytes(24).toString("hex");

  oauthCache.set(
    `linkedin_state:${state}`,
    {
      userId: user.userId || user.id || user._id,
      mobile: user.mobile,
      role: user.role,
    },
    600
  );

  const params = new URLSearchParams({
    response_type: "code",
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    state,
    scope: SCOPES.join(" "),
  });

  return `${AUTH_URL}?${params.toString()}`;
};

const getStateData = (state) => {
  const cached = oauthCache.get(`linkedin_state:${state}`);
  if (!cached) {
    throw new LinkedinApiError("Invalid or expired OAuth state", {
      statusCode: 400,
      code: "INVALID_STATE",
    });
  }
  return cached;
};

const exchangeCodeAndSync = async ({ code, state }) => {
  const stateData = getStateData(state);
  const { userId } = stateData;

  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const redirectUri = getRedirectUri();

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const tokenData = await parseResponse(tokenRes);
  if (!tokenRes.ok || tokenData.error) {
    throw new LinkedinApiError(
      tokenData.error_description ||
        tokenData.error ||
        "LinkedIn token exchange failed",
      { statusCode: tokenRes.status, code: tokenData.error }
    );
  }

  // Fetch Member Profile
  const profileRes = await fetch(USER_INFO_URL, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  const profileData = await parseResponse(profileRes);
  if (!profileRes.ok || profileData.error) {
    throw new LinkedinApiError(
      profileData.message || "Unable to fetch LinkedIn member profile",
      { statusCode: profileRes.status, code: "LINKEDIN_PROFILE_ERROR" }
    );
  }

  oauthCache.del(`linkedin_state:${state}`);

  return {
    userId,
    platformUserId: profileData.sub,
    handle: profileData.name || profileData.sub,
    name: profileData.name,
    email: profileData.email,
    profilePictureUrl: profileData.picture || "",
    followers: 0,
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
  // LinkedIn doesn't have a standard public revocation endpoint for OAuth 2.0 user tokens,
  // but we provide the hook for completeness.
  return Promise.resolve();
};

export {
  SCOPES,
  LinkedinApiError,
  LinkedinConfigError,
  buildConnectUrl,
  decryptToken,
  encryptToken,
  exchangeCodeAndSync,
  getClientId,
  getRedirectUri,
  getStateData,
  revokeStoredToken,
};
