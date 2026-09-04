import mongoose from "mongoose";

import AgencyProfile from "../../../models/AgencyProfile.js";
import BrandProfile from "../../../models/BrandProfile.js";
import BrandInvite from "../../../models/BrandInvite.js";
import Campaign from "../../../models/Campaign.js";
import CampaignApplication from "../../../models/CampaignApplication.js";
import Collaboration from "../../../models/Collaboration.js";
import InfluencerProfile from "../../../models/InfluencerProfile.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";
import { NotFoundError, ValidationError } from "../../../shared/errors/AppError.js";
import { enrichRoleProfileDocument } from "../../../application/profiles/mappers/roleProfileMapper.js";
import { toCampaignCard } from "../../../application/campaigns/mappers/campaignMapper.js";

const toPublicBrandProfile = (profile) => {
  const enriched = enrichRoleProfileDocument(profile, "brand");
  return {
    id: enriched._id,
    _id: enriched._id,
    profileId: enriched._id,
    brandId: enriched._id,
    ownerProfileId: enriched._id,
    userId: enriched.userId,
    role: "brand",
    name: enriched.brandName || enriched.displayName,
    brandName: enriched.brandName || enriched.displayName,
    displayName: enriched.displayName,
    city: enriched.city || "",
    industry: enriched.industry || "",
    niche: enriched.industry || "",
    category: enriched.industry || "",
    website: enriched.website || "",
    instagramHandle: enriched.instagramHandle || "",
    bio: enriched.bio || "",
    description: enriched.description || enriched.bio || "",
    campaignInterests: enriched.campaignInterests || [],
    monthlyCampaignBudget: enriched.monthlyCampaignBudget || "",
    contactName: enriched.contactName || enriched.contactPerson || "",
    contactPerson: enriched.contactPerson || enriched.contactName || "",
    profileImageUrl: enriched.profileImageUrl || "",
    imageUrl: enriched.imageUrl || "",
    avatarUrl: enriched.avatarUrl || "",
    logoUrl: enriched.profileImageUrl || "",
    coverImageUrl: enriched.coverImageUrl || "",
    verified: enriched.isProfileComplete === true,
    isProfileComplete: enriched.isProfileComplete === true,
  };
};

const toPublicAgencyProfile = (profile) => {
  const enriched = enrichRoleProfileDocument(profile, "agency");
  return {
    id: enriched._id,
    _id: enriched._id,
    profileId: enriched._id,
    agencyId: enriched._id,
    ownerProfileId: enriched._id,
    userId: enriched.userId,
    role: "agency",
    name: enriched.agencyName || enriched.displayName,
    agencyName: enriched.agencyName || enriched.displayName,
    displayName: enriched.displayName,
    city: enriched.city || "",
    agencyType: enriched.agencyType || "",
    niche: (enriched.focusAreas || enriched.niches || [])[0] || enriched.agencyType || "",
    category: (enriched.focusAreas || enriched.niches || [])[0] || "",
    website: enriched.website || "",
    bio: enriched.bio || "",
    description: enriched.description || enriched.bio || "",
    focusAreas: enriched.focusAreas || enriched.niches || [],
    niches: enriched.niches || enriched.focusAreas || [],
    teamSize: enriched.teamSize || "",
    creatorsManaged: enriched.creatorsManaged || "",
    contactName: enriched.contactName || enriched.contactPerson || "",
    contactPerson: enriched.contactPerson || enriched.contactName || "",
    profileImageUrl: enriched.profileImageUrl || "",
    imageUrl: enriched.imageUrl || "",
    avatarUrl: enriched.avatarUrl || "",
    coverImageUrl: enriched.coverImageUrl || "",
    verified: enriched.isProfileComplete === true,
    isProfileComplete: enriched.isProfileComplete === true,
  };
};

const mapPublicCampaign = (campaign) => {
  const card = toCampaignCard(campaign);
  return {
    id: card.id,
    title: card.title,
    budget: card.budgetAmount,
    budgetAmount: card.budgetAmount,
    budgetCurrency: card.budgetCurrency,
    budgetDisplay: card.budgetDisplay,
    deadline: card.applicationDeadline,
    applicationDeadline: card.applicationDeadline,
    coverImageUrl: card.coverImageUrl || "",
    category: card.category || "",
    status: card.status,
    brandName: card.brandName,
    agencyName: card.agencyName,
    ownerRole: card.ownerRole,
    ownerProfileId: campaign.ownerProfileId || null,
    brandProfileId: campaign.brandProfileId || null,
    agencyProfileId: campaign.agencyProfileId || null,
    daysLeft: card.daysLeft,
    daysLeftText: card.daysLeftText,
  };
};

const activeCampaignFilter = () => {
  const now = new Date();
  return {
    status: "active",
    $or: [
      { applicationDeadline: null },
      { applicationDeadline: { $exists: false } },
      { applicationDeadline: { $gte: now } },
    ],
  };
};

export const getPublicBrandProfile = asyncHandler(async (req, res) => {
  const { brandProfileId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(brandProfileId)) {
    throw new ValidationError("Valid brandProfileId is required");
  }

  const profile = await BrandProfile.findById(brandProfileId);
  if (!profile) {
    throw new NotFoundError("Brand profile not found");
  }

  sendSuccess(res, {
    message: "Brand profile fetched successfully",
    brand: toPublicBrandProfile(profile),
    profile: toPublicBrandProfile(profile),
  });
});

export const getPublicBrandCampaigns = asyncHandler(async (req, res) => {
  const { brandProfileId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(brandProfileId)) {
    throw new ValidationError("Valid brandProfileId is required");
  }

  const profile = await BrandProfile.findById(brandProfileId).select(
    "_id userId brandName"
  );
  if (!profile) {
    throw new NotFoundError("Brand profile not found");
  }

  const campaigns = await Campaign.find({
    ...activeCampaignFilter(),
    $or: [
      { brandProfileId: profile._id },
      { ownerProfileId: profile._id, ownerRole: "brand" },
      ...(profile.userId
        ? [
            { brandUserId: profile.userId },
            { ownerUserId: profile.userId, ownerRole: "brand" },
          ]
        : []),
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  const cards = campaigns.map(mapPublicCampaign);

  sendSuccess(res, {
    count: cards.length,
    campaigns: cards,
    campaignCards: cards,
    data: cards,
  });
});

export const getPublicAgencyProfile = asyncHandler(async (req, res) => {
  const { agencyProfileId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(agencyProfileId)) {
    throw new ValidationError("Valid agencyProfileId is required");
  }

  const profile = await AgencyProfile.findById(agencyProfileId);
  if (!profile) {
    throw new NotFoundError("Agency profile not found");
  }

  sendSuccess(res, {
    message: "Agency profile fetched successfully",
    agency: toPublicAgencyProfile(profile),
    profile: toPublicAgencyProfile(profile),
  });
});

export const getPublicAgencyCampaigns = asyncHandler(async (req, res) => {
  const { agencyProfileId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(agencyProfileId)) {
    throw new ValidationError("Valid agencyProfileId is required");
  }

  const profile = await AgencyProfile.findById(agencyProfileId).select(
    "_id userId agencyName"
  );
  if (!profile) {
    throw new NotFoundError("Agency profile not found");
  }

  const campaigns = await Campaign.find({
    ...activeCampaignFilter(),
    $or: [
      { agencyProfileId: profile._id },
      { ownerProfileId: profile._id, ownerRole: "agency" },
      ...(profile.userId
        ? [
            { agencyUserId: profile.userId },
            { ownerUserId: profile.userId, ownerRole: "agency" },
          ]
        : []),
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  const cards = campaigns.map(mapPublicCampaign);

  sendSuccess(res, {
    count: cards.length,
    campaigns: cards,
    campaignCards: cards,
    data: cards,
  });
});

export const getAgencyDashboard = asyncHandler(async (req, res) => {
  const agencyProfile = await AgencyProfile.findOne({
    $or: [{ userId: req.user.userId }, { mobile: req.user.mobile }],
  }).select("_id userId");

  const ownerFilter = {
    $or: [
      { agencyUserId: req.user.userId },
      { ownerUserId: req.user.userId, ownerRole: "agency" },
      ...(agencyProfile
        ? [
            { agencyProfileId: agencyProfile._id },
            { ownerProfileId: agencyProfile._id, ownerRole: "agency" },
          ]
        : []),
    ],
  };

  const campaigns = await Campaign.find(ownerFilter).select("_id status budgetAmount").lean();
  const campaignIds = campaigns.map((item) => item._id);
  const activeCampaigns = campaigns.filter((item) => item.status === "active").length;
  const budget = campaigns.reduce(
    (sum, item) => sum + Number(item.budgetAmount || 0),
    0
  );

  const [creators, pendingApprovals, activeCollabs, brandInviteCount] =
    await Promise.all([
      InfluencerProfile.countDocuments({ isProfileComplete: true }),
      campaignIds.length
        ? CampaignApplication.countDocuments({
            campaignId: { $in: campaignIds },
            status: { $in: ["applied", "shortlisted"] },
          })
        : 0,
      Collaboration.countDocuments({
        brandUserId: req.user.userId,
        status: "active",
      }),
      BrandInvite.countDocuments({
        brandUserId: req.user.userId,
        status: "pending",
      }),
    ]);

  // Brands linked via agency-owned campaigns (distinct brandProfileId/userId)
  const brandCampaigns = await Campaign.find(ownerFilter)
    .select("brandProfileId brandUserId")
    .lean();
  const brandKeys = new Set();
  for (const item of brandCampaigns) {
    if (item.brandProfileId) brandKeys.add(String(item.brandProfileId));
    else if (item.brandUserId) brandKeys.add(String(item.brandUserId));
  }

  const stats = {
    activeBrands: brandKeys.size,
    activeCampaigns,
    creators,
    pendingApprovals,
    budget,
    analytics: {
      campaignViews: 0,
      applications: pendingApprovals,
      activeCollaborations: activeCollabs,
      pendingInvites: brandInviteCount,
    },
    revenue: 0,
  };

  sendSuccess(res, {
    message: "Agency dashboard fetched successfully",
    stats,
    dashboard: stats,
    note:
      "revenue and analytics.campaignViews stay 0 until billing/analytics tracking is wired",
  });
});
