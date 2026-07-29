import mongoose from "mongoose";

import { toCampaignCard } from "../../../application/campaigns/mappers/campaignMapper.js";
import { toDiscoveryCreatorDto } from "../../../application/discovery/mappers/discoveryMapper.js";
import Campaign from "../../../models/Campaign.js";
import Community from "../../../models/Community.js";
import CommunityMembership from "../../../models/CommunityMembership.js";
import CreatorFollow from "../../../models/CreatorFollow.js";
import InfluencerProfile from "../../../models/InfluencerProfile.js";
import Notification from "../../../models/Notification.js";
import SavedCampaign from "../../../models/SavedCampaign.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/AppError.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";

const MAX_PAGE_SIZE = 100;

const userIdOf = (req) => req.user?.userId;

const parsePage = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(query.limit, 10) || 20)
  );
  return { page, limit, skip: (page - 1) * limit };
};

const requireObjectId = (value, label) => {
  if (!mongoose.isValidObjectId(value)) {
    throw new ValidationError(`Valid ${label} is required`);
  }
  return value;
};

const escapedRegex = (value) =>
  new RegExp(String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

const findMyInfluencerProfile = (userId) =>
  InfluencerProfile.findOne({ userId });

const membershipMapFor = async (communityIds, userId) => {
  if (!communityIds.length) return new Map();
  const rows = await CommunityMembership.find({
    communityId: { $in: communityIds },
    userId,
  }).lean();
  return new Map(rows.map((row) => [String(row.communityId), row]));
};

const joinedCountsFor = async (communityIds) => {
  if (!communityIds.length) return new Map();
  const rows = await CommunityMembership.aggregate([
    { $match: { communityId: { $in: communityIds }, isJoined: true } },
    { $group: { _id: "$communityId", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
};

const toCommunityDto = (community, membership, joinedCount = 0) => ({
  id: community._id,
  _id: community._id,
  name: community.name,
  tagline: community.tagline,
  category: community.category,
  city: community.city,
  imageUrl: community.imageUrl || "",
  tags: community.tags || [],
  memberCount: (community.baseMemberCount || 0) + joinedCount,
  isJoined: membership?.isJoined === true,
  isFollowing: membership?.isFollowing === true,
});

const setCommunityState = async ({
  req,
  communityId,
  field,
  enabled,
}) => {
  requireObjectId(communityId, "community id");
  const community = await Community.findOne({
    _id: communityId,
    isActive: true,
  });
  if (!community) throw new NotFoundError("Community not found");

  const userId = userIdOf(req);
  const profile = await findMyInfluencerProfile(userId);
  const now = new Date();
  const set = {
    profileId: profile?._id,
    [field]: enabled,
    ...(field === "isJoined" ? { joinedAt: enabled ? now : null } : {}),
    ...(field === "isFollowing" ? { followedAt: enabled ? now : null } : {}),
  };

  const membership = await CommunityMembership.findOneAndUpdate(
    { communityId, userId },
    { $set: set, $setOnInsert: { communityId, userId } },
    { upsert: true, new: true, runValidators: true }
  );

  return { community, membership };
};

export const listCommunities = asyncHandler(async (req, res) => {
  const userId = userIdOf(req);
  const { page, limit, skip } = parsePage(req.query);
  const query = { isActive: true };

  if (req.query.category && req.query.category !== "All") {
    query.category = req.query.category;
  }
  if (req.query.city && req.query.city !== "All") {
    query.city = req.query.city;
  }
  if (req.query.search?.trim()) {
    const regex = escapedRegex(req.query.search.trim());
    query.$or = [
      { name: regex },
      { tagline: regex },
      { category: regex },
      { city: regex },
      { tags: regex },
    ];
  }
  if (req.query.joinedOnly === "true") {
    const joined = await CommunityMembership.find({
      userId,
      isJoined: true,
    }).distinct("communityId");
    query._id = { $in: joined };
  }

  const [communities, total] = await Promise.all([
    Community.find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Community.countDocuments(query),
  ]);
  const ids = communities.map((item) => item._id);
  const [memberships, joinedCounts] = await Promise.all([
    membershipMapFor(ids, userId),
    joinedCountsFor(ids),
  ]);
  const data = communities.map((community) =>
    toCommunityDto(
      community,
      memberships.get(String(community._id)),
      joinedCounts.get(String(community._id)) || 0
    )
  );

  sendSuccess(res, {
    data,
    communities: data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const getCommunity = asyncHandler(async (req, res) => {
  const communityId = requireObjectId(req.params.communityId, "community id");
  const community = await Community.findOne({
    _id: communityId,
    isActive: true,
  }).lean();
  if (!community) throw new NotFoundError("Community not found");

  const [membership, joinedCount, members] = await Promise.all([
    CommunityMembership.findOne({
      communityId,
      userId: userIdOf(req),
    }).lean(),
    CommunityMembership.countDocuments({ communityId, isJoined: true }),
    CommunityMembership.find({ communityId, isJoined: true })
      .sort({ joinedAt: -1 })
      .limit(24)
      .select("profileId")
      .lean(),
  ]);
  const memberIds = members.map((item) => item.profileId).filter(Boolean);

  sendSuccess(res, {
    community: {
      ...toCommunityDto(community, membership, joinedCount),
      memberIds,
    },
  });
});

export const listCommunityMembers = asyncHandler(async (req, res) => {
  const communityId = requireObjectId(req.params.communityId, "community id");
  const { page, limit, skip } = parsePage(req.query);
  const communityExists = await Community.exists({
    _id: communityId,
    isActive: true,
  });
  if (!communityExists) throw new NotFoundError("Community not found");

  const [memberships, total] = await Promise.all([
    CommunityMembership.find({ communityId, isJoined: true })
      .sort({ joinedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("profileId")
      .lean(),
    CommunityMembership.countDocuments({ communityId, isJoined: true }),
  ]);
  const ids = memberships.map((item) => item.profileId).filter(Boolean);
  const profiles = await InfluencerProfile.find({ _id: { $in: ids } }).lean();
  const byId = new Map(profiles.map((item) => [String(item._id), item]));
  const creators = ids
    .map((id) => byId.get(String(id)))
    .filter(Boolean)
    .map(toDiscoveryCreatorDto);

  sendSuccess(res, {
    data: creators,
    creators,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const joinCommunity = asyncHandler(async (req, res) => {
  const { community, membership } = await setCommunityState({
    req,
    communityId: req.params.communityId,
    field: "isJoined",
    enabled: true,
  });
  const joinedCount = await CommunityMembership.countDocuments({
    communityId: community._id,
    isJoined: true,
  });
  sendSuccess(res, {
    message: "Community joined",
    community: toCommunityDto(community, membership, joinedCount),
  });
});

export const leaveCommunity = asyncHandler(async (req, res) => {
  const { community, membership } = await setCommunityState({
    req,
    communityId: req.params.communityId,
    field: "isJoined",
    enabled: false,
  });
  const joinedCount = await CommunityMembership.countDocuments({
    communityId: community._id,
    isJoined: true,
  });
  sendSuccess(res, {
    message: "Community left",
    community: toCommunityDto(community, membership, joinedCount),
  });
});

export const followCommunity = asyncHandler(async (req, res) => {
  const { community, membership } = await setCommunityState({
    req,
    communityId: req.params.communityId,
    field: "isFollowing",
    enabled: true,
  });
  const joinedCount = await CommunityMembership.countDocuments({
    communityId: community._id,
    isJoined: true,
  });
  sendSuccess(res, {
    message: "Community followed",
    community: toCommunityDto(community, membership, joinedCount),
  });
});

export const unfollowCommunity = asyncHandler(async (req, res) => {
  const { community, membership } = await setCommunityState({
    req,
    communityId: req.params.communityId,
    field: "isFollowing",
    enabled: false,
  });
  const joinedCount = await CommunityMembership.countDocuments({
    communityId: community._id,
    isJoined: true,
  });
  sendSuccess(res, {
    message: "Community unfollowed",
    community: toCommunityDto(community, membership, joinedCount),
  });
});

export const followCreator = asyncHandler(async (req, res) => {
  const followedProfileId = requireObjectId(
    req.params.profileId,
    "creator profile id"
  );
  const userId = userIdOf(req);
  const [target, ownProfile] = await Promise.all([
    InfluencerProfile.findById(followedProfileId).select("_id name"),
    findMyInfluencerProfile(userId),
  ]);
  if (!target) throw new NotFoundError("Creator profile not found");
  if (String(ownProfile?._id) === String(target._id)) {
    throw new ForbiddenError("You cannot follow your own profile");
  }

  await CreatorFollow.findOneAndUpdate(
    { followerUserId: userId, followedProfileId },
    {
      $setOnInsert: {
        followerUserId: userId,
        followerProfileId: ownProfile?._id,
        followedProfileId,
      },
    },
    { upsert: true, new: true, runValidators: true }
  );
  sendSuccess(res, {
    message: `Following ${target.name || "creator"}`,
    profileId: target._id,
    isFollowing: true,
  });
});

export const unfollowCreator = asyncHandler(async (req, res) => {
  const followedProfileId = requireObjectId(
    req.params.profileId,
    "creator profile id"
  );
  await CreatorFollow.deleteOne({
    followerUserId: userIdOf(req),
    followedProfileId,
  });
  sendSuccess(res, {
    message: "Creator unfollowed",
    profileId: followedProfileId,
    isFollowing: false,
  });
});

export const getCreatorFollowStatus = asyncHandler(async (req, res) => {
  const followedProfileId = requireObjectId(
    req.params.profileId,
    "creator profile id"
  );
  const isFollowing = Boolean(
    await CreatorFollow.exists({
      followerUserId: userIdOf(req),
      followedProfileId,
    })
  );
  sendSuccess(res, { profileId: followedProfileId, isFollowing });
});

const activityFor = (creator) => {
  const engagement = Number(creator.platforms?.[0]?.engagement || 0);
  if (engagement >= 5) {
    return {
      kind: "highEngagement",
      message: `${creator.name} is seeing strong engagement`,
    };
  }
  if (creator.contentCategories?.[0]) {
    return {
      kind: "activeInNiche",
      message: `${creator.name} is creating in ${creator.contentCategories[0]}`,
    };
  }
  if (creator.city) {
    return {
      kind: "creatingFromCity",
      message: `${creator.name} is creating from ${creator.city}`,
    };
  }
  return {
    kind: "newOnPlatform",
    message: `${creator.name} joined Viral Flight`,
  };
};

export const listFollowingFeed = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query);
  const query = { followerUserId: userIdOf(req) };
  const [follows, total] = await Promise.all([
    CreatorFollow.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CreatorFollow.countDocuments(query),
  ]);
  const ids = follows.map((item) => item.followedProfileId);
  const profiles = await InfluencerProfile.find({ _id: { $in: ids } }).lean();
  const byId = new Map(profiles.map((item) => [String(item._id), item]));
  const orderedProfiles = ids
    .map((id) => byId.get(String(id)))
    .filter(Boolean);
  const creators = orderedProfiles.map(toDiscoveryCreatorDto);
  const activities = orderedProfiles.map((profile) => ({
    id: `follow-${profile._id}`,
    creator: toDiscoveryCreatorDto(profile),
    ...activityFor(profile),
    timeLabel: "Recently",
  }));

  sendSuccess(res, {
    creators,
    activities,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const listSavedCampaigns = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query);
  const userId = userIdOf(req);
  const query = { userId };
  const [savedRows, total, profile] = await Promise.all([
    SavedCampaign.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SavedCampaign.countDocuments(query),
    findMyInfluencerProfile(userId),
  ]);
  const ids = savedRows.map((item) => item.campaignId);
  const campaigns = await Campaign.find({ _id: { $in: ids } }).lean();
  const byId = new Map(campaigns.map((item) => [String(item._id), item]));
  const data = ids
    .map((id) => byId.get(String(id)))
    .filter(Boolean)
    .map((campaign) => toCampaignCard(campaign, profile));

  sendSuccess(res, {
    data,
    campaigns: data,
    savedIds: data.map((item) => String(item.id)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const saveCampaign = asyncHandler(async (req, res) => {
  const campaignId = requireObjectId(req.params.campaignId, "campaign id");
  const campaign = await Campaign.findById(campaignId).lean();
  if (!campaign) throw new NotFoundError("Campaign not found");

  await SavedCampaign.findOneAndUpdate(
    { userId: userIdOf(req), campaignId },
    { $setOnInsert: { userId: userIdOf(req), campaignId } },
    { upsert: true, new: true, runValidators: true }
  );
  sendSuccess(res, {
    statusCode: 201,
    message: "Campaign saved",
    campaignId,
    isSaved: true,
  });
});

export const unsaveCampaign = asyncHandler(async (req, res) => {
  const campaignId = requireObjectId(req.params.campaignId, "campaign id");
  await SavedCampaign.deleteOne({ userId: userIdOf(req), campaignId });
  sendSuccess(res, {
    message: "Campaign removed from saved",
    campaignId,
    isSaved: false,
  });
});

const toNotificationDto = (notification) => ({
  id: notification._id,
  _id: notification._id,
  title: notification.title,
  body: notification.body,
  type: notification.type,
  targetId: notification.targetId || "",
  metadata: notification.metadata || {},
  isRead: notification.isRead === true,
  read: notification.isRead === true,
  createdAt: notification.createdAt,
});

export const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query);
  const query = { userId: userIdOf(req) };
  if (req.query.unreadOnly === "true") query.isRead = false;

  const [rows, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId: userIdOf(req), isRead: false }),
  ]);
  const data = rows.map(toNotificationDto);
  sendSuccess(res, {
    data,
    notifications: data,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notificationId = requireObjectId(
    req.params.notificationId,
    "notification id"
  );
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId: userIdOf(req) },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );
  if (!notification) throw new NotFoundError("Notification not found");
  sendSuccess(res, {
    message: "Notification marked as read",
    notification: toNotificationDto(notification),
  });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { userId: userIdOf(req), isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  sendSuccess(res, {
    message: "All notifications marked as read",
    updatedCount: result.modifiedCount,
  });
});
