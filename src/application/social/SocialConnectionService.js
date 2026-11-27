import InfluencerProfile from "../../models/InfluencerProfile.js";
import InfluencerSocialConnection from "../../models/InfluencerSocialConnection.js";
import {
  MetaApiError,
  exchangeCodeAndSync,
  normalizeHandle,
  syncWithStoredToken,
} from "../../infrastructure/external/meta/MetaGraphService.js";
import {
  exchangeCodeAndSync as exchangeYoutubeCodeAndSync,
  syncWithStoredToken as youtubeSyncWithStoredToken,
} from "../../infrastructure/external/youtube/YoutubeOAuthService.js";
import {
  exchangeCodeAndSync as exchangeXCodeAndSync,
} from "../../infrastructure/external/x/XOAuthService.js";
import {
  exchangeCodeAndSync as exchangeLinkedinCodeAndSync,
} from "../../infrastructure/external/linkedin/LinkedinOAuthService.js";
import { formatFollowersDisplay } from "../../shared/utils/followerFormat.js";
import { getOrCreateRoleProfile } from "../../utils/profileControllerUtils.js";

const STALE_SYNC_MS = 24 * 60 * 60 * 1000;

// Both token containers are excluded by default at the schema level. Selecting
// only their nested properties does not override the parent's `select: false`,
// so syncs received an empty token object even after a successful OAuth flow.
const tokenSelectFields = "+accessToken +refreshToken";

const migrateLegacyInstagramConnection = async (userId) => {
  console.log(`[SocialConnection:Instagram] 🔄 Checking legacy Instagram connection migration for user: ${userId}`);
  const profile = await InfluencerProfile.findOne({ userId })
    .select("+instagram.token.iv +instagram.token.tag +instagram.token.value")
    .exec();

  if (!profile?.instagram?.isConnected || !profile.instagram.token?.value) {
    console.log(`[SocialConnection:Instagram] No connected legacy Instagram profile found for user: ${userId}`);
    return null;
  }

  console.log(`[SocialConnection:Instagram] 📦 Migrating legacy Instagram connection for user: ${userId} (@${profile.instagram.handle})`);
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

const PLATFORM_LABELS = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  x: "X (Twitter)",
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
};

const buildXResponse = (connection) => {
  if (!connection?.isConnected) {
    return {
      isConnected: false,
      handle: "",
      followers: 0,
      posts: 0,
      profilePictureUrl: "",
      lastSyncedAt: null,
    };
  }

  return {
    isConnected: true,
    handle: connection.handle || "",
    followers: connection.followers ?? 0,
    posts: connection.tweetCount ?? connection.mediaCount ?? 0,
    profilePictureUrl: connection.profilePictureUrl || "",
    lastSyncedAt: connection.lastSyncedAt || null,
  };
};

const buildLinkedinResponse = (connection) => {
  if (!connection?.isConnected) {
    return {
      isConnected: false,
      handle: "",
      followers: 0,
      profilePictureUrl: "",
      lastSyncedAt: null,
    };
  }

  return {
    isConnected: true,
    handle: connection.handle || "",
    name: connection.pageName || connection.handle || "",
    followers: connection.followers ?? 0,
    profilePictureUrl: connection.profilePictureUrl || "",
    lastSyncedAt: connection.lastSyncedAt || null,
  };
};

const buildYoutubeResponse = (connection) => {
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
    handle: connection.handle || connection.channelName || "",
    channelName: connection.channelName || connection.handle || "",
    channelTitle: connection.channelName || connection.handle || "",
    channelId: connection.youtubeChannelId || connection.platformUserId,
    youtubeChannelId: connection.youtubeChannelId || connection.platformUserId,
    followers: connection.followers ?? 0,
    subscribers: connection.followers ?? 0,
    followersDisplay: formatFollowersDisplay(connection.followers),
    views: connection.views ?? 0,
    videoCount: connection.videoCount ?? connection.mediaCount ?? 0,
    profilePictureUrl: connection.profilePictureUrl,
    accountType: connection.accountType || "CHANNEL",
    lastSyncedAt: connection.lastSyncedAt,
  };
};

const buildPlatformResponse = (platform, connection) => {
  if (platform === "instagram") return buildInstagramResponse(connection);
  if (platform === "facebook") return buildFacebookResponse(connection);
  if (platform === "youtube") return buildYoutubeResponse(connection);
  if (platform === "x" || platform === "twitter") return buildXResponse(connection);
  if (platform === "linkedin") return buildLinkedinResponse(connection);
  return buildYoutubeResponse(connection);
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

  if (platform === "youtube") {
    profile.youtubeHandle = syncData.handle || syncData.channelName;

    const platformIndex = profile.platforms.findIndex(
      (item) => item.platform === "youtube"
    );
    const platformData = {
      platform: "youtube",
      username: syncData.handle,
      channelName: syncData.channelName || syncData.handle,
      subscribers: syncData.followers,
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

  if (platform === "x" || platform === "twitter") {
    profile.x = {
      handle: syncData.handle,
      followersCount: syncData.followers_count ?? syncData.followers ?? 0,
      followingCount: syncData.following_count ?? 0,
      tweetCount: syncData.tweet_count ?? syncData.mediaCount ?? 0,
      profileImageUrl: syncData.profile_image_url ?? syncData.profilePictureUrl ?? "",
      isConnected: true,
      lastSyncedAt: new Date(),
      connectedAt: profile.x?.connectedAt || new Date(),
    };

    const platformIndex = profile.platforms.findIndex(
      (item) => item.platform === "twitter" || item.platform === "x"
    );
    const platformData = {
      platform: "twitter",
      username: syncData.handle,
      followers: syncData.followers_count ?? syncData.followers ?? 0,
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

  if (platform === "linkedin") {
    profile.linkedin = {
      handle: syncData.handle,
      name: syncData.name,
      email: syncData.email,
      profilePictureUrl: syncData.profilePictureUrl || "",
      isConnected: true,
      lastSyncedAt: new Date(),
      connectedAt: profile.linkedin?.connectedAt || new Date(),
    };

    const platformIndex = profile.platforms.findIndex(
      (item) => item.platform === "linkedin"
    );
    const platformData = {
      platform: "linkedin",
      username: syncData.handle,
      followers: syncData.followers ?? 0,
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
    followers: syncData.followers ?? syncData.followers_count ?? 0,
    follows: syncData.follows ?? syncData.following_count ?? 0,
    followingCount: syncData.following_count ?? syncData.follows ?? 0,
    tweetCount: syncData.tweet_count ?? 0,
    mediaCount: syncData.mediaCount ?? syncData.tweet_count ?? 0,
    views: syncData.views,
    videoCount: syncData.videoCount,
    likes: syncData.likes,
    engagementRate: syncData.engagementRate,
    profilePictureUrl: syncData.profilePictureUrl || syncData.profile_image_url,
    accountType: syncData.accountType,
    pageName: syncData.pageName,
    facebookPageId: syncData.facebookPageId,
    channelName: syncData.channelName,
    youtubeChannelId: syncData.youtubeChannelId,
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

  if (tokenData?.encryptedRefreshToken) {
    update.refreshToken = tokenData.encryptedRefreshToken;
  }

  return InfluencerSocialConnection.findOneAndUpdate(
    { userId, platform },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).exec();
};

const connectFromOAuth = async ({ user, platform, code, state }) => {
  if (platform === "instagram") {
    console.log(`[SocialConnection:Instagram] 🔗 connectFromOAuth initiated for user: ${user?.userId}`);
  }
  const profile = await getOrCreateRoleProfile(user, InfluencerProfile);
  const preferredHandle =
    platform === "instagram" ? getPreferredInstagramHandle(profile) : undefined;

  const syncData =
    platform === "youtube"
      ? await exchangeYoutubeCodeAndSync({ code })
      : platform === "x" || platform === "twitter"
      ? await exchangeXCodeAndSync({ code, state })
      : platform === "linkedin"
      ? await exchangeLinkedinCodeAndSync({ code, state })
      : await exchangeCodeAndSync({
          code,
          platform,
          preferredHandle,
        });

  if (platform === "instagram") {
    console.log(`[SocialConnection:Instagram] 💾 Upserting connection record for user: ${user.userId} (@${syncData.handle})`);
  }

  await upsertConnection(user.userId, platform, syncData, {
    encryptedToken: syncData.encryptedToken,
    encryptedRefreshToken: syncData.encryptedRefreshToken,
    expiresAt: syncData.expiresAt,
  });

  if (platform === "instagram") {
    console.log(`[SocialConnection:Instagram] 👤 Updating influencer profile for user: ${user.userId}`);
  }

  await updateInfluencerProfileFromConnection(user, platform, syncData);

  const connection = await getConnection(user.userId, platform);
  if (platform === "instagram") {
    console.log(`[SocialConnection:Instagram] ✅ Instagram connected successfully for user: ${user.userId}`);
  }
  return buildPlatformResponse(platform, connection);
};

const applySyncToConnection = async (connection, syncData) => {
  connection.platformUserId = syncData.platformUserId;
  connection.handle = syncData.handle;
  connection.followers = syncData.followers;
  connection.follows = syncData.follows;
  connection.mediaCount = syncData.mediaCount;
  connection.views = syncData.views;
  connection.videoCount = syncData.videoCount;
  connection.likes = syncData.likes;
  connection.engagementRate = syncData.engagementRate;
  connection.profilePictureUrl = syncData.profilePictureUrl;
  connection.accountType = syncData.accountType;
  connection.pageName = syncData.pageName;
  connection.facebookPageId = syncData.facebookPageId;
  connection.channelName = syncData.channelName;
  connection.youtubeChannelId = syncData.youtubeChannelId;
  connection.isConnected = true;
  connection.lastSyncedAt = new Date();
  connection.rawMetaPayload = syncData.rawMetaPayload;
  connection.syncError = undefined;

  if (syncData.encryptedToken) {
    connection.accessToken = syncData.encryptedToken;
  }

  if (syncData.encryptedRefreshToken) {
    connection.refreshToken = syncData.encryptedRefreshToken;
  }

  if (syncData.expiresAt) {
    connection.tokenExpiresAt = syncData.expiresAt;
  }

  await connection.save();
  return connection;
};

const syncConnection = async ({ user, platform }) => {
  if (platform === "instagram") {
    console.log(`[SocialConnection:Instagram] 🔄 syncConnection initiated for user: ${user?.userId}`);
  }
  const connection = await getConnection(user.userId, platform, true);

  if (!connection?.isConnected) {
    if (platform === "instagram") {
      console.warn(`[SocialConnection:Instagram] ⚠️ Cannot sync: Instagram is not connected for user: ${user?.userId}`);
    }
    throw new MetaApiError(
      `${PLATFORM_LABELS[platform] || platform} is not connected`,
      { statusCode: 400, code: "NOT_CONNECTED" }
    );
  }

  const profile = await getOrCreateRoleProfile(user, InfluencerProfile);
  const preferredHandle =
    platform === "instagram" ? getPreferredInstagramHandle(profile) : undefined;

  try {
    const syncData =
      platform === "youtube"
        ? await youtubeSyncWithStoredToken({
            encryptedToken: connection.accessToken,
            encryptedRefreshToken: connection.refreshToken,
            tokenExpiresAt: connection.tokenExpiresAt,
          })
        : await syncWithStoredToken({
            encryptedToken: connection.accessToken,
            tokenExpiresAt: connection.tokenExpiresAt,
            platform,
            preferredHandle,
          });

    await applySyncToConnection(connection, syncData);
    await updateInfluencerProfileFromConnection(user, platform, syncData);

    if (platform === "instagram") {
      console.log(`[SocialConnection:Instagram] ✅ syncConnection completed successfully for user: ${user?.userId} (@${syncData.handle})`);
    }

    return buildPlatformResponse(platform, connection);
  } catch (error) {
    if (platform === "instagram") {
      console.error(`[SocialConnection:Instagram] ❌ syncConnection failed for user ${user?.userId}:`, error.message);
    }
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

    if ((platform === "x" || platform === "twitter") && profile?.x?.isConnected) {
      return buildXResponse({
        isConnected: true,
        handle: profile.x.handle,
        followers: profile.x.followersCount,
        tweetCount: profile.x.tweetCount,
        profilePictureUrl: profile.x.profileImageUrl,
        lastSyncedAt: profile.x.lastSyncedAt,
      });
    }

    if (platform === "linkedin" && profile?.linkedin?.isConnected) {
      return buildLinkedinResponse({
        isConnected: true,
        handle: profile.linkedin.handle,
        name: profile.linkedin.name,
        profilePictureUrl: profile.linkedin.profilePictureUrl,
        lastSyncedAt: profile.linkedin.lastSyncedAt,
      });
    }

    return buildPlatformResponse(platform, null);
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

  return buildPlatformResponse(platform, connection);
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

      const syncData =
        connection.platform === "youtube"
          ? await youtubeSyncWithStoredToken({
              encryptedToken: connection.accessToken,
              encryptedRefreshToken: connection.refreshToken,
              tokenExpiresAt: connection.tokenExpiresAt,
            })
          : await syncWithStoredToken({
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


const disconnectConnection = async ({ user, platform }) => {
  if (platform === "instagram") {
    console.log(`[SocialConnection:Instagram] 🔌 disconnectConnection requested for user: ${user?.userId}`);
  }
  const connection = await InfluencerSocialConnection.findOne({
    userId: user.userId,
    platform,
  });

  if (connection) {
    connection.isConnected = false;
    connection.accessToken = undefined;
    connection.refreshToken = undefined;
    connection.tokenExpiresAt = undefined;
    connection.syncError = undefined;
    await connection.save();
  }

  const profile = await InfluencerProfile.findOne({ userId: user.userId });
  if (profile) {
    if (platform === "instagram" && profile.instagram) {
      profile.instagram.isConnected = false;
      profile.instagram.token = undefined;
      await profile.save();
    } else if (platform === "facebook" && profile.facebook) {
      profile.facebook.isConnected = false;
      await profile.save();
    } else if (platform === "youtube" && profile.youtube) {
      profile.youtube.isConnected = false;
      await profile.save();
    } else if ((platform === "x" || platform === "twitter") && profile.x) {
      profile.x.isConnected = false;
      await profile.save();
    } else if (platform === "linkedin" && profile.linkedin) {
      profile.linkedin.isConnected = false;
      await profile.save();
    }
  }

  if (platform === "instagram") {
    console.log(`[SocialConnection:Instagram] ✅ Instagram disconnected successfully for user: ${user?.userId}`);
  }

  return buildPlatformResponse(
    platform,
    connection ? { ...connection.toObject(), isConnected: false } : null
  );
};

export {
  buildFacebookResponse,
  buildInstagramResponse,
  buildYoutubeResponse,
  connectFromOAuth,
  getConnection,
  getStats,
  syncAllConnectedAccounts,
  syncConnection,
  disconnectConnection,
};
