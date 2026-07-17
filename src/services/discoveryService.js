import InfluencerProfile from "../models/InfluencerProfile.js";

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

const getPrimaryPlatform = (profile) => {
  const platforms = profile.platforms || [];
  if (!platforms.length) return null;
  return platforms.find((item) => item.isPrimary) || platforms[0];
};

const toDiscoveryCreator = (profile) => {
  const primary = getPrimaryPlatform(profile);
  const followers = primary?.followers ?? primary?.subscribers ?? 0;
  const engagement = primary?.engagement ?? primary?.engagementRate ?? null;
  const niche = (profile.contentCategories || []).slice(0, 2).join(" · ");

  return {
    id: profile._id,
    _id: profile._id,
    profileId: profile._id,
    name: profile.name || "Creator",
    displayName: profile.name || "Creator",
    niche: niche || "Creator",
    category: (profile.contentCategories || [])[0] || "",
    city: profile.city || "",
    followersDisplay: formatFollowers(followers),
    engagementDisplay:
      engagement === null || engagement === undefined
        ? ""
        : `${Number(engagement).toFixed(1).replace(/\.0$/, "")}%`,
    imageUrl:
      profile.instagram?.profilePictureUrl ||
      profile.instagram?.profilePicture ||
      "",
    avatarUrl:
      profile.instagram?.profilePictureUrl ||
      profile.instagram?.profilePicture ||
      "",
    contentCategories: profile.contentCategories || [],
    verified: profile.isProfileComplete === true,
  };
};

const buildSearchQuery = ({ search, niche, city }) => {
  const query = { isProfileComplete: true };

  if (city && city !== "All") {
    query.city = city;
  }

  if (niche && niche !== "All") {
    query.contentCategories = niche;
  }

  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ name: regex }, { city: regex }, { contentCategories: regex }];
  }

  return query;
};

const searchInfluencers = async ({ search = "", niche = "", city = "", limit = 30 } = {}) => {
  const query = buildSearchQuery({
    search: search.trim(),
    niche: niche.trim(),
    city: city.trim(),
  });

  const profiles = await InfluencerProfile.find(query)
    .sort({ updatedAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 30, 1), 50));

  return profiles.map(toDiscoveryCreator);
};

export { searchInfluencers, toDiscoveryCreator };
