import InfluencerProfile from "../../../models/InfluencerProfile.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";
import { NotFoundError } from "../../../shared/errors/AppError.js";

const formatFollowers = (value) => {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return "";
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(count);
};

const toPublicProfile = (profile) => {
  const platforms = (profile.platforms || []).map((item) => ({
    platform: item.platform,
    username: item.username || item.channelName || "",
    handle: item.username || item.channelName || "",
    followers: item.followers ?? item.subscribers ?? 0,
    followersDisplay: formatFollowers(item.followers ?? item.subscribers),
    engagement: item.engagement ?? item.engagementRate ?? 0,
    engagementDisplay:
      item.engagement || item.engagementRate
        ? `${Number(item.engagement ?? item.engagementRate).toFixed(1)}%`
        : "",
    isConnected: Boolean(item.isConnected),
  }));

  return {
    id: profile._id,
    _id: profile._id,
    profileId: profile._id,
    userId: profile.userId,
    name: profile.name || "Creator",
    displayName: profile.name || "Creator",
    city: profile.city || "",
    bio: profile.bio || "",
    mobile: profile.mobile || "",
    whatsapp: profile.mobile || "",
    contentCategories: profile.contentCategories || [],
    contentLanguages: profile.contentLanguages || [],
    platforms,
    rateRange: profile.rateRange || {},
    pastCollaborations: profile.pastCollaborations || [],
    portfolioLink: profile.portfolioLink || "",
    collaborationPreference: profile.collaborationPreference || "",
    profileImageUrl:
      profile.instagram?.profilePictureUrl ||
      profile.instagram?.profilePicture ||
      "",
    imageUrl:
      profile.instagram?.profilePictureUrl ||
      profile.instagram?.profilePicture ||
      "",
    verified: profile.isProfileComplete === true,
    isProfileComplete: profile.isProfileComplete === true,
  };
};

export const getPublicCreatorProfile = asyncHandler(async (req, res) => {
  const { profileId } = req.params;
  const profile = await InfluencerProfile.findById(profileId);

  if (!profile) {
    throw new NotFoundError("Creator profile not found");
  }

  sendSuccess(res, {
    message: "Creator profile fetched successfully",
    profile: toPublicProfile(profile),
  });
});
