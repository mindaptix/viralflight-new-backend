import { container } from "../../../di/container.js";
import { toCampaignCard } from "../../../application/campaigns/mappers/campaignMapper.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";

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
