import { container } from "../../../di/container.js";
import { toCampaignCard } from "../../../application/campaigns/mappers/campaignMapper.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";
import Campaign from "../../../models/Campaign.js";

export const createCampaign = asyncHandler(async (req, res) => {
  const { campaign } = await container.createCampaignUseCase.execute({
    body: req.body,
    user: req.user,
  });

  sendSuccess(res, {
    statusCode: 201,
    message: "Campaign created successfully",
    campaign,
    campaignCard: toCampaignCard(campaign),
  });
});

export const createAgencyCampaignController = asyncHandler(async (req, res) => {
  const { campaign } = await container.createCampaignUseCase.execute({
    body: req.body,
    user: req.user,
  });

  sendSuccess(res, {
    statusCode: 201,
    message: "Agency campaign created successfully",
    campaign,
    campaignCard: toCampaignCard(campaign),
  });
});

export const listBrandCampaigns = asyncHandler(async (req, res) => {
  const { campaigns, campaignCards } =
    await container.listBrandCampaignsUseCase.execute({ user: req.user });

  sendSuccess(res, {
    message: "Brand campaigns fetched successfully",
    count: campaigns.length,
    campaigns,
    campaignCards,
  });
});

export const listAgencyCampaigns = asyncHandler(async (req, res) => {
  const { campaigns, campaignCards } =
    await container.listAgencyCampaignsUseCase.execute({ user: req.user });

  sendSuccess(res, {
    message: "Agency campaigns fetched successfully",
    count: campaigns.length,
    campaigns,
    campaignCards,
  });
});

export const listCampaignsForInfluencer = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  const { campaigns } =
    await container.listCampaignsForInfluencerUseCase.execute({
      user: req.user,
      limit,
    });

  sendSuccess(res, {
    message: "Campaigns for influencer fetched successfully",
    count: campaigns.length,
    campaigns,
  });
});

// ─── Campaign Marketplace (All Roles) ─────────────────────────────────────────
export const listPublicCampaigns = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status = "active",
    niche,
    scaleTier,
    campaignType,
    minBudget,
    maxBudget,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const filter = { status };

  if (niche) {
    filter.targetNiches = { $in: Array.isArray(niche) ? niche : [niche] };
  }
  if (scaleTier) {
    filter.targetScaleTier = {
      $in: Array.isArray(scaleTier) ? scaleTier : [scaleTier],
    };
  }
  if (campaignType) filter.campaignType = campaignType;
  if (minBudget || maxBudget) {
    filter.budgetAmount = {};
    if (minBudget) filter.budgetAmount.$gte = Number(minBudget);
    if (maxBudget) filter.budgetAmount.$lte = Number(maxBudget);
  }
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
    ];
  }

  const sortDir = sortOrder === "asc" ? 1 : -1;
  const sortMap = {
    createdAt: { createdAt: sortDir },
    budget: { budgetAmount: sortDir },
    deadline: { applicationDeadline: sortDir },
    views: { viewCount: sortDir },
  };
  const sort = sortMap[sortBy] || { createdAt: -1 };

  const skip = (Number(page) - 1) * Number(limit);
  const [campaigns, total] = await Promise.all([
    Campaign.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .select(
        "title description category platforms budgetAmount budgetCurrency coverImageUrl applicationDeadline status campaignType targetNiches targetScaleTier slotsTotal slotsRemaining viewCount brandUserId agencyUserId ownerUserId createdAt"
      )
      .lean(),
    Campaign.countDocuments(filter),
  ]);

  sendSuccess(res, {
    message: "Campaign marketplace fetched successfully",
    campaigns: campaigns.map((c) => ({
      ...c,
      id: String(c._id),
      _id: undefined,
    })),
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
    hasMore: skip + campaigns.length < total,
  });
});

