import InfluencerProfile from "../../models/InfluencerProfile.js";
import InfluencerSocialConnection from "../../models/InfluencerSocialConnection.js";
import {
  MetaApiError,
  exchangeCodeAndSync,
  normalizeHandle,
  syncWithStoredToken,
} from "../../infrastructure/external/meta/MetaGraphService.js";
import { formatFollowersDisplay } from "../../shared/utils/followerFormat.js";
import { getOrCreateRoleProfile } from "../../utils/profileControllerUtils.js";

const STALE_SYNC_MS = 24 * 60 * 60 * 1000;

const tokenSelectFields =
  "+accessToken.iv +accessToken.tag +accessToken.value +refreshToken.iv +refreshToken.tag +refreshToken.value";

const migrateLegacyInstagramConnection = async (userId) => {
  const profile = await InfluencerProfile.findOne({ userId })
    .select("+instagram.token.iv +instagram.token.tag +instagram.token.value")
    .exec();

  if (!profile?.instagram?.isConnected || !profile.instagram.token?.value) {
    return null;
  }

  return InfluencerSocialConnection.findOneAndUpdate(
    { userId, platform: "instagram" },
    {
      $set: {
        userId,
        platform: "instagram",
        platformUserId: profile.instagram.instagramUserId,
        handle: profile.instagram.handle,
        facebookPageId: profile.instagram.facebookPageId,
        followers: profile.instagram.followers,
        follows: profile.instagram.follows,
        mediaCount: profile.instagram.mediaCount,
        engagementRate: profile.instagram.engagementRate,
        profilePictureUrl: profile.instagram.profilePictureUrl,
        accountType: profile.instagram.accountType,
        accessToken: profile.instagram.token,
        tokenExpiresAt: profile.instagram.token.expiresAt,
        isConnected: true,
        lastSyncedAt: profile.instagram.lastSyncedAt,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).exec();
};

const getConnection = async (userId, platform, includeToken = false) => {
  let query = InfluencerSocialConnection.findOne({ userId, platform });

  if (includeToken) {
    query = query.select(tokenSelectFields);
  }

  let connection = await query.exec();

  if (!connection && platform === "instagram") {
    connection = await migrateLegacyInstagramConnection(userId);
    if (connection && includeToken) {
      connection = await InfluencerSocialConnection.findOne({ userId, platform })
        .select(tokenSelectFields)
        .exec();
    }
  }

  return connection;
};

const getPreferredInstagramHandle = (profile) => {
  const instagramPlatform = profile?.platforms?.find(
    (item) => item.platform === "instagram"
  );

  return normalizeHandle(
    profile?.instagramHandle ||
      profile?.instagram?.handle ||
      instagramPlatform?.username
  );
};

const buildInstagramResponse = (connection) => {
  if (!connection?.isConnected) {
    return {
      isConnected: false,
      handle: "",
      followers: 0,
      followersDisplay: "0",
    };
  }

  return {
    isConnected: true,
    handle: connection.handle || "",
    instagramUserId: connection.platformUserId,
    followers: connection.followers ?? 0,
    followersDisplay: formatFollowersDisplay(connection.followers),
    follows: connection.follows ?? 0,
    mediaCount: connection.mediaCount ?? 0,
    engagementRate: connection.engagementRate,
    profilePictureUrl: connection.profilePictureUrl,
    accountType: connection.accountType,
    lastSyncedAt: connection.lastSyncedAt,
  };
};

const buildFacebookResponse = (connection) => {
  if (!connection?.isConnected) {
    return {
      isConnected: false,
      handle: "",
      followers: 0,
      followersDisplay: "0",
    };
  }

  return {
    isConnected: true,
    handle: connection.handle || connection.pageName || "",
    pageName: connection.pageName || connection.handle || "",
    facebookPageId: connection.facebookPageId || connection.platformUserId,
    facebookUserId: connection.platformUserId,
    followers: connection.followers ?? 0,
    followersDisplay: formatFollowersDisplay(connection.followers),
    likes: connection.likes ?? connection.followers ?? 0,
    mediaCount: connection.mediaCount ?? 0,
    engagementRate: connection.engagementRate,
    profilePictureUrl: connection.profilePictureUrl,
    accountType: connection.accountType || "PAGE",
    lastSyncedAt: connection.lastSyncedAt,
  };
};

const updateInfluencerProfileFromConnection = async (user, platform, syncData) => {
  const profile = await getOrCreateRoleProfile(user, InfluencerProfile);

  if (platform === "instagram") {
    profile.instagramHandle = syncData.handle;

    profile.instagram = {
      ...(profile.instagram?.toObject?.() || profile.instagram || {}),
      handle: syncData.handle,
      instagramUserId: syncData.platformUserId,
      facebookPageId: syncData.facebookPageId,
      accountType: syncData.accountType,
      followers: syncData.followers,
      follows: syncData.follows,
      mediaCount: syncData.mediaCount,
      engagementRate: syncData.engagementRate,
      profilePictureUrl: syncData.profilePictureUrl,
      lastSyncedAt: new Date(),
      connectedAt: profile.instagram?.connectedAt || new Date(),
      isConnected: true,
      syncError: undefined,
    };

    const platformIndex = profile.platforms.findIndex(
      (item) => item.platform === "instagram"
    );
    const platformData = {
      platform: "instagram",
      username: syncData.handle,
      followers: syncData.followers,
      engagement: syncData.engagementRate ?? 0,
    };

    if (platformIndex >= 0) {
      profile.platforms[platformIndex] = {
        ...profile.platforms[platformIndex].toObject?.(),
        ...platformData,
      };
    } else {
      profile.platforms.push(platformData);
    }
  }

  if (platform === "facebook") {
    profile.facebookPageName = syncData.pageName || syncData.handle;
    profile.facebookPageId = syncData.facebookPageId || syncData.platformUserId;

    const platformIndex = profile.platforms.findIndex(
      (item) => item.platform === "facebook"
    );
    const platformData = {
      platform: "facebook",
      username: syncData.pageName || syncData.handle,
      followers: syncData.followers,
      engagement: syncData.engagementRate ?? 0,
    };

    if (platformIndex >= 0) {
      profile.platforms[platformIndex] = {
        ...profile.platforms[platformIndex].toObject?.(),
        ...platformData,
      };
    } else {
      profile.platforms.push(platformData);
    }
  }

  await profile.save();
  return profile;
};

const upsertConnection = async (userId, platform, syncData, tokenData) => {
  const now = new Date();
  const update = {
    userId,
    platform,
    platformUserId: syncData.platformUserId,
    handle: syncData.handle,
    followers: syncData.followers,
    follows: syncData.follows,
    mediaCount: syncData.mediaCount,
    likes: syncData.likes,
    engagementRate: syncData.engagementRate,
    profilePictureUrl: syncData.profilePictureUrl,
    accountType: syncData.accountType,
    pageName: syncData.pageName,
    facebookPageId: syncData.facebookPageId,
    isConnected: true,
    lastSyncedAt: now,
    rawMetaPayload: syncData.rawMetaPayload,
    syncError: undefined,
    tokenExpiresAt: tokenData?.expiresAt,
    accessToken: tokenData?.encryptedToken || syncData.encryptedToken,
  };

  if (tokenData?.encryptedToken) {
    update.accessToken = tokenData.encryptedToken;
  }

  return InfluencerSocialConnection.findOneAndUpdate(
    { userId, platform },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).exec();
};

const connectFromOAuth = async ({ user, platform, code }) => {
  const profile = await getOrCreateRoleProfile(user, InfluencerProfile);
  const preferredHandle =
    platform === "instagram" ? getPreferredInstagramHandle(profile) : undefined;

  const syncData = await exchangeCodeAndSync({
    code,
    platform,
    preferredHandle,
  });

  await upsertConnection(user.userId, platform, syncData, {
    encryptedToken: syncData.encryptedToken,
    expiresAt: syncData.expiresAt,
  });

  await updateInfluencerProfileFromConnection(user, platform, syncData);

  const connection = await getConnection(user.userId, platform);
  return platform === "instagram"
    ? buildInstagramResponse(connection)
    : buildFacebookResponse(connection);
};

const applySyncToConnection = async (connection, syncData) => {
  connection.platformUserId = syncData.platformUserId;
  connection.handle = syncData.handle;
  connection.followers = syncData.followers;
  connection.follows = syncData.follows;
  connection.mediaCount = syncData.mediaCount;
  connection.likes = syncData.likes;
  connection.engagementRate = syncData.engagementRate;
  connection.profilePictureUrl = syncData.profilePictureUrl;
  connection.accountType = syncData.accountType;
  connection.pageName = syncData.pageName;
  connection.facebookPageId = syncData.facebookPageId;
  connection.isConnected = true;
  connection.lastSyncedAt = new Date();
  connection.rawMetaPayload = syncData.rawMetaPayload;
  connection.syncError = undefined;

  if (syncData.encryptedToken) {
    connection.accessToken = syncData.encryptedToken;
  }

  if (syncData.expiresAt) {
    connection.tokenExpiresAt = syncData.expiresAt;
  }

  await connection.save();
  return connection;
};

const syncConnection = async ({ user, platform }) => {
  const connection = await getConnection(user.userId, platform, true);

  if (!connection?.isConnected) {
    throw new MetaApiError(
      `${platform === "instagram" ? "Instagram" : "Facebook"} is not connected`,
      { statusCode: 400, code: "NOT_CONNECTED" }
    );
  }

  const profile = await getOrCreateRoleProfile(user, InfluencerProfile);
  const preferredHandle =
    platform === "instagram" ? getPreferredInstagramHandle(profile) : undefined;

  try {
    const syncData = await syncWithStoredToken({
      encryptedToken: connection.accessToken,
      tokenExpiresAt: connection.tokenExpiresAt,
      platform,
      preferredHandle,
    });

    await applySyncToConnection(connection, syncData);
    await updateInfluencerProfileFromConnection(user, platform, syncData);

    return platform === "instagram"
      ? buildInstagramResponse(connection)
      : buildFacebookResponse(connection);
  } catch (error) {
    connection.syncError = {
      message: error.message,
      code: error.code,
      occurredAt: new Date(),
    };

    if (error.statusCode === 401 || error.code === 190) {
      connection.isConnected = false;
    }

    await connection.save();
    throw error;
  }
};

const getStats = async ({ user, platform, autoSyncIfStale = true }) => {
  let connection = await getConnection(user.userId, platform);

  if (!connection?.isConnected) {
    const profile = await getOrCreateRoleProfile(user, InfluencerProfile);

    if (platform === "instagram" && profile?.instagram?.isConnected) {
      return buildInstagramResponse({
        isConnected: true,
        handle: profile.instagram.handle,
        platformUserId: profile.instagram.instagramUserId,
        followers: profile.instagram.followers,
        follows: profile.instagram.follows,
        mediaCount: profile.instagram.mediaCount,
        engagementRate: profile.instagram.engagementRate,
        profilePictureUrl: profile.instagram.profilePictureUrl,
        accountType: profile.instagram.accountType,
        lastSyncedAt: profile.instagram.lastSyncedAt,
      });
    }

    return platform === "instagram"
      ? buildInstagramResponse(null)
      : buildFacebookResponse(null);
  }

  const isStale =
    !connection.lastSyncedAt ||
    Date.now() - new Date(connection.lastSyncedAt).getTime() > STALE_SYNC_MS;

  if (autoSyncIfStale && isStale) {
    try {
      return await syncConnection({ user, platform });
    } catch (error) {
      // Return cached data if background sync fails.
    }
  }

  return platform === "instagram"
    ? buildInstagramResponse(connection)
    : buildFacebookResponse(connection);
};

const syncAllConnectedAccounts = async () => {
  const connections = await InfluencerSocialConnection.find({
    isConnected: true,
  })
    .select(tokenSelectFields)
    .exec();

  let synced = 0;
  let failed = 0;

  for (const connection of connections) {
    try {
      const user = { userId: connection.userId };
      const profile = await InfluencerProfile.findOne({
        userId: connection.userId,
      }).exec();
      const preferredHandle =
        connection.platform === "instagram"
          ? getPreferredInstagramHandle(profile)
          : undefined;

      const syncData = await syncWithStoredToken({
        encryptedToken: connection.accessToken,
        tokenExpiresAt: connection.tokenExpiresAt,
        platform: connection.platform,
        preferredHandle,
      });

      await applySyncToConnection(connection, syncData);

      if (profile) {
        await updateInfluencerProfileFromConnection(
          { userId: connection.userId, mobile: profile.mobile, role: "influencer" },
          connection.platform,
          syncData
        );
      }

      synced += 1;
    } catch (error) {
      connection.syncError = {
        message: error.message,
        code: error.code,
        occurredAt: new Date(),
      };

      if (error.statusCode === 401 || error.code === 190) {
        connection.isConnected = false;
      }

      await connection.save();
      failed += 1;
      console.error(
        `[social-sync] Failed for user ${connection.userId} (${connection.platform}):`,
        error.message
      );
    }
  }

  return { synced, failed, total: connections.length };
};

export {
  buildFacebookResponse,
  buildInstagramResponse,
  connectFromOAuth,
  getConnection,
  getStats,
  syncAllConnectedAccounts,
  syncConnection,
};
