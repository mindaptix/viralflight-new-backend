import InfluencerProfile from "../../../models/InfluencerProfile.js";
import {
  buildConnectUrl,
  exchangeCodeAndSync,
  MetaApiError,
  MetaConfigError,
  normalizeHandle,
  syncWithStoredToken,
  verifyStateToken,
} from "../../../infrastructure/external/meta/MetaGraphService.js";
import {
  getOrCreateRoleProfile,
  getProfileQuery,
} from "../../../utils/profileControllerUtils.js";

const formatCount = (value) => {
  const number = Number(value || 0);

  if (number >= 1000000) {
    return `${Number((number / 1000000).toFixed(1))}M`;
  }

  if (number >= 1000) {
    return `${Number((number / 1000).toFixed(1))}K`;
  }

  return String(number);
};

const getManualInstagramHandle = (profile) => {
  const instagramPlatform = profile.platforms?.find(
    (item) => item.platform === "instagram"
  );

  return normalizeHandle(instagramPlatform?.username || profile.instagram?.handle);
};

const buildInstagramStats = (profile) => {
  const manualInstagram = profile.platforms?.find(
    (item) => item.platform === "instagram"
  );
  const instagram = profile.instagram || {};
  const followers = instagram.followers ?? manualInstagram?.followers ?? 0;
  const engagementRate =
    instagram.engagementRate ?? manualInstagram?.engagement ?? undefined;
  const handle = instagram.handle ?? manualInstagram?.username;

  return {
    handle,
    instagramUserId: instagram.instagramUserId,
    followers,
    followersDisplay: formatCount(followers),
    follows: instagram.follows,
    mediaCount: instagram.mediaCount,
    engagementRate,
    lastSyncedAt: instagram.lastSyncedAt,
    accountType: instagram.accountType,
    profilePictureUrl: instagram.profilePictureUrl,
    isConnected: Boolean(instagram.isConnected),
    syncError: instagram.syncError,
  };
};

const applyInstagramSyncToProfile = (profile, syncData, tokenData) => {
  const now = new Date();

  profile.instagram = {
    ...(profile.instagram?.toObject?.() || profile.instagram || {}),
    handle: syncData.handle,
    instagramUserId: syncData.instagramUserId || syncData.platformUserId,
    facebookPageId: syncData.facebookPageId,
    accountType: syncData.accountType,
    followers: syncData.followers,
    follows: syncData.follows,
    mediaCount: syncData.mediaCount,
    engagementRate: syncData.engagementRate,
    profilePictureUrl: syncData.profilePictureUrl,
    lastSyncedAt: now,
    connectedAt: profile.instagram?.connectedAt || now,
    isConnected: true,
    syncError: undefined,
    token: tokenData || profile.instagram?.token,
  };

  const platformData = {
    platform: "instagram",
    username: syncData.handle,
    followers: syncData.followers,
    engagement: syncData.engagementRate ?? 0,
  };
  const platformIndex = profile.platforms.findIndex(
    (item) => item.platform === "instagram"
  );

  if (platformIndex >= 0) {
    profile.platforms[platformIndex] = {
      ...profile.platforms[platformIndex].toObject?.(),
      ...platformData,
    };
  } else {
    profile.platforms.push(platformData);
  }
};

const sendOAuthResult = (res, statusCode, payload) => {
  const redirectBase = payload.success
    ? process.env.INSTAGRAM_OAUTH_SUCCESS_REDIRECT
    : process.env.INSTAGRAM_OAUTH_ERROR_REDIRECT;

  if (!redirectBase) {
    return res.status(statusCode).json(payload);
  }

  const redirectUrl = new URL(redirectBase);
  redirectUrl.searchParams.set("instagramConnected", payload.success ? "1" : "0");

  if (!payload.success) {
    redirectUrl.searchParams.set("error", payload.message);
  }

  return res.redirect(redirectUrl.toString());
};

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const renderOAuthLandingPage = (res, { success, message }) => {
  const title = success ? "Instagram connected" : "Instagram connection failed";
  const safeMessage = escapeHtml(
    message ||
      (success
        ? "Your Instagram account is now connected to ViralFlight."
        : "We could not connect your Instagram account. Please return to ViralFlight and try again.")
  );

  res.set("Cache-Control", "no-store");
  return res.status(success ? 200 : 400).type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} | ViralFlight</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0f172a; color: #e2e8f0; font-family: system-ui, sans-serif; }
      main { width: min(90%, 520px); padding: 32px; border-radius: 20px; background: #1e293b; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,.35); }
      h1 { margin: 0 0 12px; color: ${success ? "#4ade80" : "#fb7185"}; }
      p { line-height: 1.6; }
    </style>
  </head>
  <body><main><h1>${title}</h1><p>${safeMessage}</p><p>You can close this window and return to the ViralFlight app.</p></main></body>
</html>`);
};

export const showInstagramCallbackSuccess = (req, res) =>
  renderOAuthLandingPage(res, {
    success: true,
    message: "Your Instagram account is now connected to ViralFlight.",
  });

export const showInstagramCallbackError = (req, res) =>
  renderOAuthLandingPage(res, {
    success: false,
    message: req.query.error,
  });

const handleInstagramError = (res, error, fallbackMessage) => {
  const statusCode =
    error instanceof MetaConfigError || error instanceof MetaApiError
      ? error.statusCode
      : 500;

  return res.status(statusCode).json({
    success: false,
    message: error.message || fallbackMessage,
    code: error.code,
  });
};

export const getInstagramConnectUrl = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user?.userId;
    console.log(`[InstagramController] 🔗 getInstagramConnectUrl requested by user: ${userId}`);
    const connectUrl = buildConnectUrl(req.user, "instagram");
    console.log(`[InstagramController] ✅ Generated connect URL: ${connectUrl}`);

    res.json({
      success: true,
      message: "Instagram connect URL generated successfully",
      connectUrl,
      expiresInSeconds: 600,
    });
  } catch (error) {
    console.error("[InstagramController] ❌ getInstagramConnectUrl error:", error);
    handleInstagramError(res, error, "Unable to generate Instagram connect URL");
  }
};

export const handleInstagramCallback = async (req, res) => {
  try {
    const { code, state, error, error_description: errorDescription } = req.query;
    console.log("[InstagramController] 📩 handleInstagramCallback received:", {
      hasCode: Boolean(code),
      state: state ? `${String(state).substring(0, 15)}...` : undefined,
      error,
      errorDescription,
    });

    if (error) {
      console.warn(`[InstagramController] ⚠️ Instagram callback returned error: ${error} - ${errorDescription}`);
      return sendOAuthResult(res, 400, {
        success: false,
        message: errorDescription || String(error),
      });
    }

    if (!code || !state) {
      console.warn("[InstagramController] ⚠️ Instagram callback missing code or state parameter");
      return sendOAuthResult(res, 400, {
        success: false,
        message: "Instagram callback requires code and state",
      });
    }

    console.log("[InstagramController] 🔍 Verifying state token...");
    const stateUser = verifyStateToken(String(state), "instagram");
    console.log(`[InstagramController] 🔍 State verified for user: ${stateUser?.userId}, role: ${stateUser?.role}`);

    if (stateUser.role !== "influencer") {
      console.warn(`[InstagramController] ⚠️ Non-influencer role attempted Instagram connection: ${stateUser.role}`);
      return sendOAuthResult(res, 403, {
        success: false,
        message: "Only influencer accounts can connect Instagram",
      });
    }

    const profile = await getOrCreateRoleProfile(stateUser, InfluencerProfile);
    console.log(`[InstagramController] 👤 Found profile: ${profile._id}. Exchanging code with Meta Graph API...`);
    const syncData = await exchangeCodeAndSync({
      platform: "instagram",
      code: String(code),
      preferredHandle: getManualInstagramHandle(profile),
    });
    console.log(`[InstagramController] 📊 Code exchanged successfully! Synced handle: ${syncData.handle}, followers: ${syncData.followers}, engagement: ${syncData.engagementRate}`);

    applyInstagramSyncToProfile(profile, syncData, {
      ...syncData.encryptedToken,
      expiresAt: syncData.expiresAt,
    });

    await profile.save();
    console.log(`[InstagramController] ✅ Profile ${profile._id} updated with Instagram connection successfully!`);

    return sendOAuthResult(res, 200, {
      success: true,
      message: "Instagram connected successfully",
      instagram: buildInstagramStats(profile),
    });
  } catch (error) {
    console.error("[InstagramController] ❌ handleInstagramCallback error:", error);
    return sendOAuthResult(res, error.statusCode || 500, {
      success: false,
      message: error.message || "Unable to connect Instagram",
      code: error.code,
    });
  }
};

export const syncInstagram = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user?.userId;
    console.log(`[InstagramController] 🔄 syncInstagram requested by user: ${userId}`);
    const profile = await InfluencerProfile.findOne(getProfileQuery(req.user))
      .select("+instagram.token.iv +instagram.token.tag +instagram.token.value")
      .exec();

    if (!profile?.instagram?.isConnected) {
      console.warn(`[InstagramController] ⚠️ Instagram is not connected for profile: ${profile?._id}`);
      return res.status(400).json({
        success: false,
        message: "Instagram is not connected for this influencer profile",
      });
    }

    try {
      console.log(`[InstagramController] 🔄 Calling syncWithStoredToken for handle: ${profile.instagram?.handle}...`);
      const syncData = await syncWithStoredToken({
        encryptedToken: profile.instagram.token,
        tokenExpiresAt: profile.instagram.token?.expiresAt,
        platform: "instagram",
        preferredHandle: getManualInstagramHandle(profile),
      });

      applyInstagramSyncToProfile(profile, syncData);
      await profile.save();
      console.log(`[InstagramController] ✅ Instagram sync complete. Followers: ${syncData.followers}, engagement: ${syncData.engagementRate}`);

      return res.json({
        success: true,
        message: "Instagram synced successfully",
        instagram: buildInstagramStats(profile),
      });
    } catch (error) {
      console.error("[InstagramController] ❌ syncWithStoredToken failed:", error);
      profile.instagram.syncError = {
        message: error.message,
        code: error.code,
        occurredAt: new Date(),
      };
      await profile.save();
      throw error;
    }
  } catch (error) {
    console.error("[InstagramController] ❌ syncInstagram error:", error);
    handleInstagramError(res, error, "Unable to sync Instagram");
  }
};

export const getInstagramStats = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user?.userId;
    console.log(`[InstagramController] 📊 getInstagramStats requested by user: ${userId}`);
    const profile = await getOrCreateRoleProfile(req.user, InfluencerProfile);
    console.log(`[InstagramController] 📊 Returning stats: isConnected=${profile.instagram?.isConnected}, handle=${profile.instagram?.handle}, followers=${profile.instagram?.followers}`);

    res.json({
      success: true,
      message: "Instagram stats fetched successfully",
      instagram: buildInstagramStats(profile),
    });
  } catch (error) {
    console.error("[InstagramController] ❌ getInstagramStats error:", error);
    handleInstagramError(res, error, "Unable to fetch Instagram stats");
  }
};
