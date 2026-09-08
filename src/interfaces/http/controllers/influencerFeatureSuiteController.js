import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";
import {
  getInfluencerHomeDashboard,
  getCuratedCampaigns,
  applyToCuratedCampaign,
  toggleCampaignBookmark,
  getAutoMatchRateCard,
  updateAutoMatchRateCard,
  resetAutoMatchRateCardDefaults,
  getDealsSummary,
  getDealsByTab,
  acceptEscrowDeal,
  counterOfferDeal,
  submitMilestoneDraft,
} from "../../../application/influencer/InfluencerFeatureSuiteService.js";

// ─── 1. Home & Feed ──────────────────────────────────────────────────────────
export const getHomeDashboardController = asyncHandler(async (req, res) => {
  const result = await getInfluencerHomeDashboard({ user: req.user });
  sendSuccess(res, {
    message: "Home dashboard fetched successfully",
    data: result,
    ...result,
  });
});

export const getCuratedCampaignsController = asyncHandler(async (req, res) => {
  const result = await getCuratedCampaigns({
    user: req.user,
    query: req.query,
  });
  sendSuccess(res, {
    message: "Curated campaigns fetched successfully",
    data: result,
    ...result,
  });
});

export const applyToCuratedCampaignController = asyncHandler(async (req, res) => {
  const result = await applyToCuratedCampaign({
    user: req.user,
    campaignId: req.params.campaignId,
    body: req.body,
  });
  sendSuccess(res, {
    statusCode: 201,
    message: "Application submitted successfully",
    data: result,
    ...result,
  });
});

export const toggleCampaignBookmarkController = asyncHandler(async (req, res) => {
  const result = await toggleCampaignBookmark({
    user: req.user,
    campaignId: req.params.campaignId,
  });
  sendSuccess(res, {
    message: result.isBookmarked ? "Campaign bookmarked" : "Bookmark removed",
    data: result,
    ...result,
  });
});

// ─── 2. Auto-Match Rate Card ─────────────────────────────────────────────────
export const getAutoMatchRateCardController = asyncHandler(async (req, res) => {
  const result = await getAutoMatchRateCard({ user: req.user });
  sendSuccess(res, {
    message: "Rate card fetched successfully",
    data: result,
    ...result,
  });
});

export const updateAutoMatchRateCardController = asyncHandler(async (req, res) => {
  const result = await updateAutoMatchRateCard({
    user: req.user,
    body: req.body,
  });
  sendSuccess(res, {
    message: "Rate card updated successfully",
    data: result,
    ...result,
  });
});

export const resetAutoMatchRateCardDefaultsController = asyncHandler(
  async (req, res) => {
    const result = await resetAutoMatchRateCardDefaults({ user: req.user });
    sendSuccess(res, {
      message: "Rate card reset to AI defaults",
      data: result,
      ...result,
    });
  }
);

// ─── 3. Deals, Sponsorships & Escrow Management ─────────────────────────────
export const getDealsSummaryController = asyncHandler(async (req, res) => {
  const result = await getDealsSummary({ user: req.user });
  sendSuccess(res, {
    message: "Deals summary fetched successfully",
    data: result,
    ...result,
  });
});

export const getDealsController = asyncHandler(async (req, res) => {
  const result = await getDealsByTab({
    user: req.user,
    query: req.query,
  });
  sendSuccess(res, {
    message: "Deals fetched successfully",
    data: result,
    ...result,
  });
});

export const acceptEscrowDealController = asyncHandler(async (req, res) => {
  const result = await acceptEscrowDeal({
    user: req.user,
    dealId: req.params.dealId,
  });
  sendSuccess(res, {
    message: "Escrow deal accepted successfully",
    data: result,
    ...result,
  });
});

export const counterOfferDealController = asyncHandler(async (req, res) => {
  const result = await counterOfferDeal({
    user: req.user,
    dealId: req.params.dealId,
    body: req.body,
  });
  sendSuccess(res, {
    message: "Counter offer submitted successfully",
    data: result,
    ...result,
  });
});

export const submitMilestoneDraftController = asyncHandler(async (req, res) => {
  const result = await submitMilestoneDraft({
    user: req.user,
    dealId: req.params.dealId,
    milestoneId: req.params.milestoneId,
    body: req.body,
  });
  sendSuccess(res, {
    message: "Milestone draft submitted successfully",
    data: result,
    ...result,
  });
});
