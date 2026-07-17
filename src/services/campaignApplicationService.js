import Campaign from "../models/Campaign.js";
import CampaignApplication, {
  APPLICATION_STATUSES,
} from "../models/CampaignApplication.js";
import InfluencerProfile from "../models/InfluencerProfile.js";

const normalizeText = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const normalizeLinks = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
    .filter(Boolean);
};

const toApplicationResponse = (application) => ({
  id: application._id,
  _id: application._id,
  campaignId: application.campaignId,
  influencerProfileId: application.influencerProfileId,
  influencerName: application.influencerName,
  status: application.status,
  note: application.note || application.pitch,
  pitch: application.pitch || application.note,
  proposedRate: application.proposedRate,
  currency: application.currency,
  quotedRate: {
    amount: application.proposedRate,
    currency: application.currency,
  },
  portfolioLinks: application.portfolioLinks || [],
  createdAt: application.createdAt,
});

const getInfluencerProfile = async (user) =>
  InfluencerProfile.findOne({
    $or: [{ userId: user.userId }, { mobile: user.mobile }],
  });

const getActiveCampaign = async (campaignId) => {
  if (!campaignId) return null;

  const campaign = await Campaign.findById(campaignId);
  if (!campaign || campaign.status !== "active") {
    return null;
  }

  const now = new Date();
  if (
    campaign.applicationDeadline &&
    new Date(campaign.applicationDeadline) < now
  ) {
    return null;
  }

  return campaign;
};

const applyToCampaign = async (campaignId, body, user) => {
  const campaign = await getActiveCampaign(campaignId);
  if (!campaign) {
    return { error: "Campaign not found or closed", status: 404 };
  }

  const note =
    normalizeText(body.note) ||
    normalizeText(body.pitch) ||
    normalizeText(body.message);

  const proposedRate = Number(
    body.proposedRate ?? body.quotedRate?.amount ?? body.quotedAmount
  );
  const currency =
    normalizeText(body.currency ?? body.quotedRate?.currency) || "INR";

  if (!note || note.length < 10) {
    return {
      error: "Add a short pitch (at least 10 characters)",
      status: 400,
    };
  }

  if (!Number.isFinite(proposedRate) || proposedRate <= 0) {
    return { error: "proposedRate must be greater than 0", status: 400 };
  }

  const influencerProfile = await getInfluencerProfile(user);
  const existing = await CampaignApplication.findOne({
    campaignId: campaign._id,
    influencerUserId: user.userId,
  });

  if (existing) {
    return {
      error: "Already applied",
      status: 409,
      application: toApplicationResponse(existing),
    };
  }

  const application = await CampaignApplication.create({
    campaignId: campaign._id,
    influencerUserId: user.userId,
    influencerProfileId: influencerProfile?._id,
    influencerName: influencerProfile?.name || "Creator",
    influencerMobile: user.mobile,
    note,
    pitch: note,
    proposedRate,
    currency,
    portfolioLinks: normalizeLinks(body.portfolioLinks),
    status: "applied",
  });

  return { application };
};

const getMyApplicationForCampaign = async (campaignId, user) => {
  const application = await CampaignApplication.findOne({
    campaignId,
    influencerUserId: user.userId,
  });

  return application ? toApplicationResponse(application) : null;
};

const listMyApplications = async (user) => {
  const applications = await CampaignApplication.find({
    influencerUserId: user.userId,
  }).sort({ createdAt: -1 });

  const campaignIds = applications.map((item) => item.campaignId);
  const campaigns = await Campaign.find({ _id: { $in: campaignIds } });
  const campaignMap = new Map(
    campaigns.map((campaign) => [String(campaign._id), campaign])
  );

  return applications.map((application) => {
    const campaign = campaignMap.get(String(application.campaignId));
    return {
      ...toApplicationResponse(application),
      campaignTitle: campaign?.title || "",
      campaignBrand:
        campaign?.ownerName || campaign?.brandName || campaign?.agencyName || "",
      campaignCategory: campaign?.category || "",
      campaignImageUrl: campaign?.coverImageUrl || "",
    };
  });
};

const assertCampaignOwner = async (campaignId, user) => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    return { error: "Campaign not found", status: 404 };
  }

  if (String(campaign.ownerUserId) !== String(user.userId)) {
    return { error: "Not your campaign", status: 403 };
  }

  return { campaign };
};

const listCampaignApplications = async (campaignId, user) => {
  const { campaign, error, status } = await assertCampaignOwner(campaignId, user);
  if (error) return { error, status };

  const applications = await CampaignApplication.find({
    campaignId: campaign._id,
  }).sort({ createdAt: -1 });

  return {
    applications: applications.map((application) => ({
      ...toApplicationResponse(application),
      influencerName: application.influencerName || "Creator",
      followersDisplay: "",
      matchPercent: 0,
    })),
  };
};

const updateApplicationStatus = async (applicationId, body, user) => {
  const application = await CampaignApplication.findById(applicationId);
  if (!application) {
    return { error: "Application not found", status: 404 };
  }

  const { campaign, error, status } = await assertCampaignOwner(
    application.campaignId,
    user
  );
  if (error) return { error, status };

  const nextStatus = normalizeText(body.status);
  if (!nextStatus || !APPLICATION_STATUSES.includes(nextStatus)) {
    return {
      error: `Valid status is required: ${APPLICATION_STATUSES.join(", ")}`,
      status: 400,
    };
  }

  application.status = nextStatus;
  application.ownerMessage = normalizeText(body.message) || "";
  await application.save();

  return { application: toApplicationResponse(application), campaign };
};

export {
  applyToCampaign,
  getMyApplicationForCampaign,
  listCampaignApplications,
  listMyApplications,
  toApplicationResponse,
  updateApplicationStatus,
};
