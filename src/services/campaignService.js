import BrandProfile from "../models/BrandProfile.js";
import Campaign, { CAMPAIGN_STATUSES } from "../models/Campaign.js";
import InfluencerProfile from "../models/InfluencerProfile.js";

const toStringList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeText = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const normalizeBudgetAmount = (value) => {
  if (value === undefined || value === null || value === "") return 0;

  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
};

const normalizeDate = (value) => {
  if (!value) return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatBudget = (amount, currency = "INR") => {
  if (!amount) return null;

  const symbol = currency === "INR" ? "INR " : `${currency} `;
  return `${symbol}${new Intl.NumberFormat("en-IN").format(amount)}`;
};

const getDaysLeft = (deadline) => {
  if (!deadline) return null;

  const today = new Date();
  const endDate = new Date(deadline);
  const diffMs = endDate.setHours(23, 59, 59, 999) - today.getTime();

  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

const calculateMatchPercent = (campaign, influencerProfile) => {
  if (!influencerProfile) return 80;

  let score = 70;
  const categories = (influencerProfile.contentCategories || []).map((item) =>
    item.toLowerCase()
  );
  const platforms = (influencerProfile.platforms || []).map((item) => item.platform);

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

const toCampaignCard = (campaign, influencerProfile) => {
  const daysLeft = getDaysLeft(campaign.applicationDeadline);
  const budgetDisplay = formatBudget(campaign.budgetAmount, campaign.budgetCurrency);

  return {
    id: campaign._id,
    brandName: campaign.brandName,
    title: campaign.title,
    description: campaign.description,
    category: campaign.category,
    platforms: campaign.platforms,
    deliverables: campaign.deliverables,
    budgetAmount: campaign.budgetAmount,
    budgetCurrency: campaign.budgetCurrency,
    budgetDisplay,
    coverImageUrl: campaign.coverImageUrl,
    location: campaign.location,
    applicationDeadline: campaign.applicationDeadline,
    daysLeft,
    daysLeftText: daysLeft === null ? null : `${daysLeft} days left`,
    matchPercent: calculateMatchPercent(campaign, influencerProfile),
    status: campaign.status,
  };
};

const buildCampaignData = async (body, user) => {
  const title = normalizeText(body.title);
  const category = normalizeText(body.category);
  const description = normalizeText(body.description);
  const budgetAmount = normalizeBudgetAmount(body.budgetAmount ?? body.budget);
  const applicationDeadline = normalizeDate(
    body.applicationDeadline ?? body.deadline
  );
  const status = normalizeText(body.status) || "active";

  if (!title || title.length < 2) {
    return { error: "Campaign title is required and must be at least 2 characters" };
  }

  if (!category) {
    return { error: "Campaign category is required" };
  }

  if (budgetAmount === null) {
    return { error: "Budget amount must be a valid positive number" };
  }

  if (applicationDeadline === null) {
    return { error: "Application deadline must be a valid date" };
  }

  if (!CAMPAIGN_STATUSES.includes(status)) {
    return {
      error: `Valid status is required: ${CAMPAIGN_STATUSES.join(", ")}`,
    };
  }

  const brandProfile = await BrandProfile.findOne({
    $or: [{ userId: user.userId }, { mobile: user.mobile }],
  });

  return {
    campaignData: {
      brandUserId: user.userId,
      brandProfileId: brandProfile?._id,
      brandMobile: user.mobile,
      brandName: normalizeText(body.brandName) || brandProfile?.brandName,
      title,
      description,
      category,
      platforms: toStringList(body.platforms),
      deliverables: toStringList(body.deliverables),
      budgetAmount,
      budgetCurrency: normalizeText(body.budgetCurrency ?? body.currency) || "INR",
      coverImageUrl: normalizeText(body.coverImageUrl ?? body.imageUrl),
      location: normalizeText(body.location ?? body.city),
      applicationDeadline,
      status,
    },
  };
};

const createBrandCampaign = async (body, user) => {
  const { campaignData, error } = await buildCampaignData(body, user);

  if (error) return { error };

  const campaign = await Campaign.create(campaignData);
  return { campaign };
};

const getBrandCampaigns = async (user) =>
  Campaign.find({ brandUserId: user.userId }).sort({ createdAt: -1 });

const getCampaignsForInfluencer = async (user, { limit = 10 } = {}) => {
  const influencerProfile = await InfluencerProfile.findOne({
    $or: [{ userId: user.userId }, { mobile: user.mobile }],
  });
  const now = new Date();
  const campaigns = await Campaign.find({
    status: "active",
    $or: [
      { applicationDeadline: { $exists: false } },
      { applicationDeadline: null },
      { applicationDeadline: { $gte: now } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(limit);

  return campaigns.map((campaign) => toCampaignCard(campaign, influencerProfile));
};

export {
  createBrandCampaign,
  getBrandCampaigns,
  getCampaignsForInfluencer,
  toCampaignCard,
};
