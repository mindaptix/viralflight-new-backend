import {
  createAgencyCampaign,
  createBrandCampaign,
  getAgencyCampaigns,
  getBrandCampaigns,
  getCampaignsForInfluencer,
  toCampaignCard,
} from "../services/campaignService.js";

export const createCampaign = async (req, res) => {
  try {
    const { campaign, error } = await createBrandCampaign(req.body, req.user);

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    res.status(201).json({
      success: true,
      message: "Campaign created successfully",
      campaign,
      campaignCard: toCampaignCard(campaign),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAgencyCampaignController = async (req, res) => {
  try {
    const { campaign, error } = await createAgencyCampaign(req.body, req.user);

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    res.status(201).json({
      success: true,
      message: "Agency campaign created successfully",
      campaign,
      campaignCard: toCampaignCard(campaign),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listBrandCampaigns = async (req, res) => {
  try {
    const campaigns = await getBrandCampaigns(req.user);

    res.json({
      success: true,
      message: "Brand campaigns fetched successfully",
      count: campaigns.length,
      campaigns,
      campaignCards: campaigns.map((campaign) => toCampaignCard(campaign)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listAgencyCampaigns = async (req, res) => {
  try {
    const campaigns = await getAgencyCampaigns(req.user);

    res.json({
      success: true,
      message: "Agency campaigns fetched successfully",
      count: campaigns.length,
      campaigns,
      campaignCards: campaigns.map((campaign) => toCampaignCard(campaign)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listCampaignsForInfluencer = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const campaigns = await getCampaignsForInfluencer(req.user, {
      limit: Math.min(Math.max(limit, 1), 50),
    });

    res.json({
      success: true,
      message: "Campaigns for influencer fetched successfully",
      count: campaigns.length,
      campaigns,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
