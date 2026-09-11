import InfluencerProfile from "../../../models/InfluencerProfile.js";
import {
  InstagramApiError,
  InstagramConfigError,
  buildConnectUrl,
  exchangeCodeAndSync,
  normalizeHandle,
  syncWithStoredToken,
  verifyStateToken,
} from "../../../infrastructure/external/instagram/InstagramGraphService.js";
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
    instagramUserId: syncData.instagramUserId,
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

const handleInstagramError = (res, error, fallbackMessage) => {
  const statusCode =
    error instanceof InstagramConfigError || error instanceof InstagramApiError
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
    const connectUrl = buildConnectUrl(req.user);

    res.json({
      success: true,
      message: "Instagram connect URL generated successfully",
      connectUrl,
      expiresInSeconds: 600,
    });
  } catch (error) {
    handleInstagramError(res, error, "Unable to generate Instagram connect URL");
  }
};

export const handleInstagramCallback = async (req, res) => {
  try {
    const { code, state, error, error_description: errorDescription } = req.query;

    if (error) {
      return sendOAuthResult(res, 400, {
        success: false,
        message: errorDescription || String(error),
      });
    }

    if (!code || !state) {
      return sendOAuthResult(res, 400, {
        success: false,
        message: "Instagram callback requires code and state",
      });
    }

    const stateUser = verifyStateToken(String(state));

    if (stateUser.role !== "influencer") {
      return sendOAuthResult(res, 403, {
        success: false,
        message: "Only influencer accounts can connect Instagram",
      });
    }

    const profile = await getOrCreateRoleProfile(stateUser, InfluencerProfile);
    const syncData = await exchangeCodeAndSync({
      code: String(code),
      preferredHandle: getManualInstagramHandle(profile),
    });

    applyInstagramSyncToProfile(profile, syncData, {
      ...syncData.encryptedToken,
      expiresAt: syncData.expiresAt,
    });

    await profile.save();

    return sendOAuthResult(res, 200, {
      success: true,
      message: "Instagram connected successfully",
      instagram: buildInstagramStats(profile),
    });
  } catch (error) {
    return sendOAuthResult(res, error.statusCode || 500, {
      success: false,
      message: error.message || "Unable to connect Instagram",
      code: error.code,
    });
  }
};

export const syncInstagram = async (req, res) => {
  try {
    const profile = await InfluencerProfile.findOne(getProfileQuery(req.user))
      .select("+instagram.token.iv +instagram.token.tag +instagram.token.value")
      .exec();

    if (!profile?.instagram?.isConnected) {
      return res.status(400).json({
        success: false,
        message: "Instagram is not connected for this influencer profile",
      });
    }

    try {
      const syncData = await syncWithStoredToken(
        profile.instagram.token,
        getManualInstagramHandle(profile)
      );

      applyInstagramSyncToProfile(profile, syncData);
      await profile.save();

      return res.json({
        success: true,
        message: "Instagram synced successfully",
        instagram: buildInstagramStats(profile),
      });
    } catch (error) {
      profile.instagram.syncError = {
        message: error.message,
        code: error.code,
        occurredAt: new Date(),
      };
      await profile.save();
      throw error;
    }
  } catch (error) {
    handleInstagramError(res, error, "Unable to sync Instagram");
  }
};

export const getInstagramStats = async (req, res) => {
  try {
    const profile = await getOrCreateRoleProfile(req.user, InfluencerProfile);

    res.json({
      success: true,
      message: "Instagram stats fetched successfully",
      instagram: buildInstagramStats(profile),
    });
  } catch (error) {
    handleInstagramError(res, error, "Unable to fetch Instagram stats");
  }
};
