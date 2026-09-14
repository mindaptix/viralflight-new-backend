export const isCampaignOpen = (campaign, now = new Date()) => {
  if (!campaign || campaign.status !== "active") {
    return false;
  }

  if (
    campaign.applicationDeadline &&
    new Date(campaign.applicationDeadline) < now
  ) {
    return false;
  }

  return true;
};

export const calculateMatchPercent = (campaign, influencerProfile) => {
  if (!influencerProfile) return 80;

  let score = 70;
  const categories = (influencerProfile.contentCategories || []).map((item) =>
    item.toLowerCase()
  );
  const platforms = (influencerProfile.platforms || []).map(
    (item) => item.platform
  );

  if (
    campaign.category &&
    categories.some((category) => category === campaign.category.toLowerCase())
  ) {
    score += 15;
  }

  if (
    campaign.platforms?.length > 0 &&
    campaign.platforms.some((platform) => platforms.includes(platform))
  ) {
    score += 10;
  }

  if (campaign.location && influencerProfile.city === campaign.location) {
    score += 5;
  }

  return Math.min(score, 99);
};

export const isCampaignOwner = (campaign, user) =>
  String(campaign.ownerUserId) === String(user.userId);

export const campaignActions = {
  draft: { publish: "active", archive: "archived" },
  active: { draft: "draft", pause: "paused", close: "completed" },
  paused: { draft: "draft", publish: "active", close: "completed", archive: "archived" },
  completed: { archive: "archived" },
  cancelled: { archive: "archived" },
  archived: {},
};

export const campaignPermissions = (campaign, user) => {
  const isOwner = Boolean(user?.userId && campaign.ownerUserId &&
    user.role === campaign.ownerRole && isCampaignOwner(campaign, user));
  return {
    isOwner,
    availableActions: isOwner && user.role === "agency"
      ? Object.keys(campaignActions[campaign.status] || {}) : [],
    canReport: ["influencer", "brand"].includes(user?.role),
  };
};
