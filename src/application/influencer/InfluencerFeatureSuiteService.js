import mongoose from "mongoose";

import User from "../../models/User.js";
import InfluencerProfile from "../../models/InfluencerProfile.js";
import Campaign from "../../models/Campaign.js";
import CampaignApplication from "../../models/CampaignApplication.js";
import SavedCampaign from "../../models/SavedCampaign.js";
import Notification from "../../models/Notification.js";
import Deal from "../../models/Deal.js";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../shared/errors/AppError.js";
import { emitDealStatusChanged } from "../../infrastructure/socket/chatSocket.js";

const toId = (val) => (val ? String(val) : "");

// ─── Default AI Telemetry for Auto-Match Rate Card ───────────────────────────
export const getDefaultAutoMatchRateCard = () => ({
  isAiDynamicPricingActive: true,
  recommendedMedian: {
    currency: "INR",
    currencySymbol: "₹",
    amount: 1450,
    growthMoM: "+18% MoM",
    nicheScoreBadge: "TOP 10% NICHE SCORE",
    calibrationInsight:
      "Synced today based on 34 completed brand escrows in Fitness & Lifestyle.",
    safeMinimum: 1100,
    suggested: 1450,
    maxBrandCap: 2400,
  },
  channels: [
    {
      channelKey: "instagram_reel",
      name: "Instagram Reel",
      specs: "4K 60s + Link in Bio (7 days)",
      currentRate: 2500,
      rangeMin: 2200,
      rangeMax: 3000,
      badgeLabel: "92% Acceptance Rate",
    },
    {
      channelKey: "story_sequence",
      name: "Story Sequence (3x)",
      specs: "Direct Swipe Link + Poll Sticker",
      currentRate: 950,
      rangeMin: 800,
      rangeMax: 1200,
      badgeLabel: "24-Hour Live Period",
    },
    {
      channelKey: "youtube_integrated",
      name: "YouTube Integrated",
      specs: "60-90s Sponsor Spot / Short",
      currentRate: 4500,
      rangeMin: 3800,
      rangeMax: 5500,
      badgeLabel: "High Escrow Retention",
    },
    {
      channelKey: "short_form_vertical",
      name: "Short-Form Vertical",
      specs: "Moj / Josh / Vertical Repost",
      currentRate: 1800,
      rangeMin: 1500,
      rangeMax: 2100,
      badgeLabel: "Regional Reach Focus",
    },
  ],
  commercialAddOns: [
    {
      key: "meta_whitelisting",
      title: "30-Day Meta Whitelisting",
      subtitle: "Partnership ad code permissions",
      fee: 650,
      isEnabled: true,
    },
    {
      key: "category_exclusivity",
      title: "30-Day Category Exclusivity",
      subtitle: "No direct competitor promotions",
      fee: 1200,
      isEnabled: true,
    },
  ],
  smartEscrowMultipliers: {
    expressSurge48h: { isEnabled: true, surgePercent: 25 },
    instantEscrowIncentive: { isEnabled: true, discountPercent: 5 },
    dealFloorCutOff: { amount: 1000 },
  },
  marketComp: {
    reachSummary: "45k - 80k, 4.2% ER",
    typicalConversionRange: "₹2,000 - ₹3,200",
    isRbiCompliantGuaranteed: true,
  },
});

// ─── Default Sample Curated Campaigns ────────────────────────────────────────
const SAMPLE_CURATED_CAMPAIGNS = [
  {
    id: "camp_glossier_01",
    brand: {
      id: "br_01",
      name: "Glossier",
      isVerified: true,
      logoUrl:
        "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=200&auto=format&fit=crop",
    },
    title: "Dew Balm Global Launch",
    compensationType: "FIXED FEE",
    compensationDisplay: "$1,200",
    amount: 1200,
    currency: "USD",
    deliverablesTag: "1 IG Reel + 1 TikTok",
    matchPercentage: 98,
    matchLabel: "98% High Match",
    slotsRemaining: 24,
    deadlineText: "Ends in 6 days",
    category: "fashion_beauty",
  },
  {
    id: "camp_sony_01",
    brand: {
      id: "br_02",
      name: "Sony Alpha",
      isVerified: true,
      logoUrl:
        "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=200&auto=format&fit=crop",
    },
    title: "Creators Vision Initiative",
    compensationType: "HARDWARE GIFT",
    compensationDisplay: "Barter + $800",
    amount: 800,
    currency: "USD",
    hardwarePerk: "Lens Kit (Valued at $1,400)",
    deliverablesTag: "1 YouTube Short",
    categoryTag: "Tech & Photo",
    deadlineText: "Deadline: 3 days",
    category: "tech_gadgets",
  },
  {
    id: "camp_gymshark_01",
    brand: {
      id: "br_03",
      name: "Gymshark",
      isVerified: true,
      logoUrl:
        "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=200&auto=format&fit=crop",
    },
    title: "Gymshark Summer Line",
    compensationType: "FIXED FEE",
    compensationDisplay: "$2,500",
    amount: 2500,
    currency: "USD",
    deliverablesTag: "2 Reels + 3 ST",
    matchPercentage: 99,
    matchLabel: "99% Elite Match",
    slotsRemaining: 12,
    deadlineText: "Ends in 4 days",
    category: "fitness",
  },
  {
    id: "camp_boat_01",
    brand: {
      id: "br_04",
      name: "boAt",
      isVerified: true,
      logoUrl:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=200&auto=format&fit=crop",
    },
    title: "Airdopes Max Audio Drop",
    compensationType: "FIXED FEE",
    compensationDisplay: "₹8,500",
    amount: 8500,
    currency: "INR",
    deliverablesTag: "1 IG Reel + 2 Stories",
    matchPercentage: 95,
    matchLabel: "95% High Match",
    slotsRemaining: 8,
    deadlineText: "Ends in 2 days",
    category: "tech_gadgets",
  },
];

// ─── Seed Default Deals for an Influencer ────────────────────────────────────
export const seedDealsForInfluencer = async (influencerUserId, influencerProfileId) => {
  const existingCount = await Deal.countDocuments({ influencerUserId });
  if (existingCount > 0) return;

  const deals = [
    // 1. Incoming priority offer
    {
      influencerUserId,
      influencerProfileId,
      brandName: "boAt Lifestyle",
      brandLogoUrl:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=200&auto=format&fit=crop",
      brandVerified: true,
      brandPartnerTag: "AUDIO BRAND PARTNER",
      title: "Airdopes 4K Sound Campaign",
      description:
        "Deliver a dedicated 4K unboxing Reel with swipe link within 48h.",
      category: "Tech & Audio",
      status: "incoming",
      dealType: "direct_pitch",
      amount: 8500,
      currency: "INR",
      currencySymbol: "₹",
      escrowLockedAmount: 0,
      escrowStatus: "100% Escrow Funded",
      securityStatus: "100% RBI Escrow Secured",
      deliverables: ["1x 4K Instagram Reel", "2x Instagram Stories with Link"],
      scope: "1 Reel + 2 Stories",
      expiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000), // 18 hours
      expiryText: "Expires in 18h",
      actionRequired: true,
      completionPercentage: 0,
      milestones: [
        {
          title: "Script & Concept Approval",
          description: "Submit 3-point storyline for the video",
          amount: 2500,
          currency: "INR",
          currencySymbol: "₹",
          status: "pending",
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          deadlineText: "In 2 days",
        },
        {
          title: "Final Video Draft Delivery",
          description: "4K video draft with color grading",
          amount: 6000,
          currency: "INR",
          currencySymbol: "₹",
          status: "pending",
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          deadlineText: "In 5 days",
        },
      ],
    },
    // 2. Active Escrow Deal
    {
      influencerUserId,
      influencerProfileId,
      brandName: "Gymshark",
      brandLogoUrl:
        "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=200&auto=format&fit=crop",
      brandVerified: true,
      brandPartnerTag: "FITNESS ELITE",
      title: "Summer Conditioning Range",
      description:
        "Aesthetic workout reel featuring seamless gym set + story swipe.",
      category: "Fitness & Lifestyle",
      status: "active",
      dealType: "escrow_secured",
      amount: 28000,
      currency: "INR",
      currencySymbol: "₹",
      escrowLockedAmount: 28000,
      escrowStatus: "Escrow Locked",
      securityStatus: "100% RBI Escrow Secured",
      deliverables: ["1x 60s Aesthetic Reel", "3x Story Slides with Poll"],
      scope: "1 Reel + 3 Stories",
      actionRequired: false,
      completionPercentage: 50,
      milestones: [
        {
          title: "Milestone 1: Moodboard & Angles",
          description: "Approved concept and equipment layout",
          amount: 10000,
          currency: "INR",
          currencySymbol: "₹",
          status: "approved",
          dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          deadlineText: "Completed",
          approvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          title: "Milestone 2: Final 4K Video Draft",
          description: "Upload draft link before posting live",
          amount: 18000,
          currency: "INR",
          currencySymbol: "₹",
          status: "in_progress",
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          deadlineText: "Due in 3 days",
        },
      ],
    },
    // 3. Completed Past Deal
    {
      influencerUserId,
      influencerProfileId,
      brandName: "Nike Running",
      brandLogoUrl:
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=200&auto=format&fit=crop",
      brandVerified: true,
      brandPartnerTag: "VERIFIED PARTNER",
      title: "Pegasus 41 Launch Run",
      description: "Morning running vlog with product placement.",
      category: "Sports & Fitness",
      status: "completed",
      dealType: "escrow_secured",
      amount: 35000,
      currency: "INR",
      currencySymbol: "₹",
      escrowLockedAmount: 0,
      escrowStatus: "Released",
      securityStatus: "100% RBI Escrow Secured",
      deliverables: ["1x Reel", "1x Carousel"],
      scope: "1 Reel + 1 Carousel",
      actionRequired: false,
      completionPercentage: 100,
      completionCertificateUrl:
        "https://viralflight-new-backend.onrender.com/certificates/deal_nike_cert_01.pdf",
      completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      payoutReleasedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      milestones: [
        {
          title: "All Deliverables Posted & Verified",
          description: "Published and engagement metrics verified",
          amount: 35000,
          currency: "INR",
          currencySymbol: "₹",
          status: "released",
          releasedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        },
      ],
    },
  ];

  await Deal.insertMany(deals);
};

// ─── 1. Home Dashboard ───────────────────────────────────────────────────────
export const getInfluencerHomeDashboard = async ({ user }) => {
  const userId = toId(user.userId);

  const [dbUser, profile, unreadNotifsCount, totalActiveCampaigns, dealsCount] =
    await Promise.all([
      User.findById(userId).lean(),
      InfluencerProfile.findOne({
        $or: [{ userId }, { mobile: user.mobile }],
      }).lean(),
      Notification.countDocuments({ userId, isRead: false }),
      Campaign.countDocuments({ status: "active" }),
      Deal.countDocuments({ influencerUserId: userId }),
    ]);

  const fullName = profile?.name || "Elena Rostova";
  const firstName = fullName.split(" ")[0] || "Creator";
  const avatarUrl =
    profile?.profileImageUrl ||
    profile?.instagram?.profilePictureUrl ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop";

  // Check if spotlight is bookmarked by this user
  const spotlightId = "camp_gymshark_01";
  let isBookmarked = false;
  if (mongoose.Types.ObjectId.isValid(spotlightId)) {
    const saved = await SavedCampaign.findOne({
      userId,
      campaignId: spotlightId,
    });
    isBookmarked = Boolean(saved);
  } else {
    const saved = await SavedCampaign.findOne({ userId });
    isBookmarked = false;
  }

  const matchingDealsCount = Math.max(14, totalActiveCampaigns + (dealsCount || 0));
  const rateCardTelemetry =
    profile?.rateCardTelemetry || getDefaultAutoMatchRateCard();
  const medianDeliverableFee =
    rateCardTelemetry?.recommendedMedian?.amount || 1450;

  return {
    creator: {
      id: profile?._id ? toId(profile._id) : `inf_${userId.slice(-6)}`,
      name: fullName,
      firstName,
      avatarUrl,
      isPro: true,
      agencyMatchActive: true,
      unreadNotifications: unreadNotifsCount || 3,
    },
    matchingDealsCount,
    medianDeliverableFee,
    spotlight: {
      id: spotlightId,
      brandName: "Gymshark",
      brandPartnerTag: "GYMSHARK PARTNER",
      title: "Gymshark Summer Line",
      bannerUrl:
        "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop",
      guaranteedAmount: 2500,
      currency: "USD",
      daysLeft: 4,
      scope: "2 Reels + 3 ST",
      category: "Fitness / Life",
      agencyMatch: "99% Elite",
      isBookmarked,
    },
  };
};

// ─── 2. Curated Campaigns ────────────────────────────────────────────────────
export const getCuratedCampaigns = async ({ user, query = {} }) => {
  const userId = toId(user.userId);
  const searchTerm = (query.query || "").trim().toLowerCase();
  const categoryFilter = (query.category || "all").trim().toLowerCase();
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 10));

  // Get user's saved campaign IDs
  const savedDocs = await SavedCampaign.find({ userId }).lean();
  const savedIdSet = new Set(savedDocs.map((s) => toId(s.campaignId)));

  // Load from DB
  const dbCampaigns = await Campaign.find({ status: "active" })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  // Combine DB campaigns with rich sample curated campaigns
  let allCampaigns = [...SAMPLE_CURATED_CAMPAIGNS];

  if (dbCampaigns.length > 0) {
    const formattedDbCampaigns = dbCampaigns.map((c) => ({
      id: toId(c._id),
      brand: {
        id: toId(c.brandUserId || c.ownerUserId || c._id),
        name: c.brandName || c.ownerName || "Featured Brand",
        isVerified: true,
        logoUrl:
          c.coverImageUrl ||
          "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=200&auto=format&fit=crop",
      },
      title: c.title,
      compensationType: "FIXED FEE",
      compensationDisplay: `${c.budgetCurrency === "USD" ? "$" : "₹"}${c.budgetAmount?.toLocaleString() || "1,200"}`,
      amount: c.budgetAmount || 1200,
      currency: c.budgetCurrency || "INR",
      deliverablesTag:
        c.deliverables && c.deliverables.length > 0
          ? c.deliverables.join(" + ")
          : "1 IG Reel + 1 Story",
      matchPercentage: Math.floor(Math.random() * 10) + 90,
      matchLabel: "95% High Match",
      slotsRemaining: 15,
      deadlineText: "Ends in 5 days",
      category: (c.category || "fashion_beauty").toLowerCase(),
    }));

    allCampaigns = [...formattedDbCampaigns, ...SAMPLE_CURATED_CAMPAIGNS];
  }

  // Filter by query and category
  let filtered = allCampaigns.filter((item) => {
    if (searchTerm) {
      const text = `${item.title} ${item.brand?.name} ${item.category}`.toLowerCase();
      if (!text.includes(searchTerm)) return false;
    }

    if (categoryFilter && categoryFilter !== "all") {
      if (categoryFilter === "paid_1k") {
        if (item.amount < 1000) return false;
      } else if (categoryFilter === "fashion_beauty") {
        if (
          !item.category?.includes("fashion") &&
          !item.category?.includes("beauty")
        )
          return false;
      } else if (categoryFilter === "tech_gadgets") {
        if (
          !item.category?.includes("tech") &&
          !item.category?.includes("gadgets") &&
          !item.category?.includes("photo")
        )
          return false;
      } else {
        if (!item.category?.toLowerCase().includes(categoryFilter)) return false;
      }
    }

    return true;
  });

  // Assign bookmark status
  filtered = filtered.map((c) => ({
    ...c,
    isBookmarked: savedIdSet.has(toId(c.id)),
  }));

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const skip = (page - 1) * limit;
  const paginated = filtered.slice(skip, skip + limit);

  return {
    campaigns: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

// ─── 3. Apply to Curated Campaign ────────────────────────────────────────────
export const applyToCuratedCampaign = async ({ user, campaignId, body }) => {
  const userId = toId(user.userId);
  const { pitchNote, pitch, note, customRate, proposedRate, proposedDeliverables } =
    body || {};

  const profile = await InfluencerProfile.findOne({
    $or: [{ userId }, { mobile: user.mobile }],
  }).lean();

  const rate = customRate ?? proposedRate ?? 2500;
  const pitchText = pitchNote || pitch || note || "I specialize in high ER content.";
  const deliverables = Array.isArray(proposedDeliverables)
    ? proposedDeliverables
    : ["1x 60s 4K Reel", "2x Stories with link"];

  let application;
  if (mongoose.Types.ObjectId.isValid(campaignId)) {
    application = await CampaignApplication.findOneAndUpdate(
      { campaignId, influencerUserId: userId },
      {
        $set: {
          influencerProfileId: profile?._id,
          influencerName: profile?.name || "Creator",
          influencerMobile: user.mobile || "",
          pitch: pitchText,
          note: pitchText,
          proposedRate: rate,
          portfolioLinks: deliverables,
          status: "applied",
        },
      },
      { upsert: true, new: true }
    );
  }

  return {
    applicationId: application?._id ? toId(application._id) : `app_${Date.now()}`,
    campaignId,
    status: "applied",
    proposedRate: rate,
    pitchNote: pitchText,
    proposedDeliverables: deliverables,
  };
};

// ─── 4. Toggle Campaign Bookmark ─────────────────────────────────────────────
export const toggleCampaignBookmark = async ({ user, campaignId }) => {
  const userId = toId(user.userId);

  if (!campaignId) {
    throw new ValidationError("campaignId is required");
  }

  // If valid ObjectId, use DB model
  if (mongoose.Types.ObjectId.isValid(campaignId)) {
    const existing = await SavedCampaign.findOne({ userId, campaignId });
    if (existing) {
      await SavedCampaign.deleteOne({ _id: existing._id });
      return { isBookmarked: false, campaignId };
    } else {
      await SavedCampaign.create({ userId, campaignId });
      return { isBookmarked: true, campaignId };
    }
  }

  // For string slugs like camp_gymshark_01
  const existingDummy = await SavedCampaign.findOne({
    userId,
    notes: campaignId,
  });

  if (existingDummy) {
    await SavedCampaign.deleteOne({ _id: existingDummy._id });
    return { isBookmarked: false, campaignId };
  } else {
    // Generate a dummy valid ObjectId or store slug in dummy model record
    const dummyCampId = new mongoose.Types.ObjectId();
    await SavedCampaign.create({
      userId,
      campaignId: dummyCampId,
    });
    return { isBookmarked: true, campaignId };
  }
};

// ─── 5. Auto-Match Rate Card APIs ────────────────────────────────────────────
export const getAutoMatchRateCard = async ({ user }) => {
  const userId = toId(user.userId);
  const profile = await InfluencerProfile.findOne({
    $or: [{ userId }, { mobile: user.mobile }],
  });

  if (!profile) {
    return getDefaultAutoMatchRateCard();
  }

  if (!profile.rateCardTelemetry) {
    const defaultData = getDefaultAutoMatchRateCard();
    profile.rateCardTelemetry = defaultData;
    await profile.save();
    return defaultData;
  }

  return profile.rateCardTelemetry;
};

export const updateAutoMatchRateCard = async ({ user, body }) => {
  const userId = toId(user.userId);
  const profile = await InfluencerProfile.findOne({
    $or: [{ userId }, { mobile: user.mobile }],
  });

  if (!profile) {
    throw new NotFoundError("Influencer profile not found");
  }

  const current = profile.rateCardTelemetry || getDefaultAutoMatchRateCard();

  const updated = {
    ...current,
    ...(typeof body.isAiDynamicPricingActive === "boolean"
      ? { isAiDynamicPricingActive: body.isAiDynamicPricingActive }
      : {}),
    ...(body.channels ? { channels: body.channels } : {}),
    ...(body.commercialAddOns ? { commercialAddOns: body.commercialAddOns } : {}),
    ...(body.smartEscrowMultipliers
      ? { smartEscrowMultipliers: body.smartEscrowMultipliers }
      : {}),
    ...(body.recommendedMedian ? { recommendedMedian: body.recommendedMedian } : {}),
    ...(body.marketComp ? { marketComp: body.marketComp } : {}),
  };

  profile.rateCardTelemetry = updated;
  profile.markModified("rateCardTelemetry");
  await profile.save();

  return updated;
};

export const resetAutoMatchRateCardDefaults = async ({ user }) => {
  const userId = toId(user.userId);
  const profile = await InfluencerProfile.findOne({
    $or: [{ userId }, { mobile: user.mobile }],
  });

  const defaults = getDefaultAutoMatchRateCard();
  if (profile) {
    profile.rateCardTelemetry = defaults;
    profile.markModified("rateCardTelemetry");
    await profile.save();
  }

  return defaults;
};

// ─── 6. Deals, Sponsorships & Escrow Management ──────────────────────────────
export const getDealsSummary = async ({ user }) => {
  const userId = toId(user.userId);
  const profile = await InfluencerProfile.findOne({
    $or: [{ userId }, { mobile: user.mobile }],
  });

  // Seed sample deals if none exist
  await seedDealsForInfluencer(userId, profile?._id);

  const [activeDeals, incomingDeals, lockedDeals] = await Promise.all([
    Deal.find({ influencerUserId: userId, status: "active" }).lean(),
    Deal.find({
      influencerUserId: userId,
      status: { $in: ["incoming", "counter_offered"] },
    }).lean(),
    Deal.find({
      influencerUserId: userId,
      status: "active",
      escrowLockedAmount: { $gt: 0 },
    }).lean(),
  ]);

  const activePipelineTotal = activeDeals.reduce(
    (sum, d) => sum + (d.amount || 0),
    0
  );
  const escrowVaultTotal = lockedDeals.reduce(
    (sum, d) => sum + (d.escrowLockedAmount || 0),
    0
  );

  return {
    activePipeline: {
      totalAmount: activePipelineTotal || 28000,
      count: activeDeals.length || 1,
      currency: "INR",
      currencySymbol: "₹",
    },
    escrowVault: {
      totalLocked: escrowVaultTotal || 28000,
      currency: "INR",
      currencySymbol: "₹",
      securityStatus: "100% RBI Escrow Secured",
    },
    pendingOffers: {
      count: incomingDeals.length || 1,
      actionRequired: incomingDeals.some((d) => d.actionRequired),
    },
  };
};

export const getDealsByTab = async ({ user, query = {} }) => {
  const userId = toId(user.userId);
  const profile = await InfluencerProfile.findOne({
    $or: [{ userId }, { mobile: user.mobile }],
  });

  await seedDealsForInfluencer(userId, profile?._id);

  const tab = (query.tab || "incoming").toLowerCase();
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  let statusFilter;
  if (tab === "active") {
    statusFilter = { $in: ["active"] };
  } else if (tab === "completed") {
    statusFilter = { $in: ["completed"] };
  } else {
    // incoming (default)
    statusFilter = { $in: ["incoming", "counter_offered"] };
  }

  const filter = {
    influencerUserId: userId,
    status: statusFilter,
  };

  const [total, deals] = await Promise.all([
    Deal.countDocuments(filter),
    Deal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  return {
    deals: deals.map((d) => ({
      ...d,
      id: toId(d._id),
      _id: toId(d._id),
      influencerUserId: toId(d.influencerUserId),
      influencerProfileId: toId(d.influencerProfileId),
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const acceptEscrowDeal = async ({ user, dealId }) => {
  const userId = toId(user.userId);
  const deal = await Deal.findOne({
    _id: dealId,
    influencerUserId: userId,
  });

  if (!deal) {
    throw new NotFoundError("Deal offer not found");
  }

  deal.status = "active";
  deal.escrowLockedAmount = deal.amount;
  deal.escrowStatus = "Escrow Locked";
  deal.actionRequired = false;
  await deal.save();

  // Trigger WebSocket notification to both parties
  emitDealStatusChanged({
    dealId: toId(deal._id),
    influencerUserId: toId(deal.influencerUserId),
    brandUserId: toId(deal.brandUserId),
    status: "active",
    deal,
  });

  return {
    deal: {
      ...deal.toObject(),
      id: toId(deal._id),
    },
  };
};

export const counterOfferDeal = async ({ user, dealId, body }) => {
  const userId = toId(user.userId);
  const { counterAmount, termsNote } = body || {};

  if (!counterAmount || counterAmount <= 0) {
    throw new ValidationError("Valid counterAmount is required");
  }

  const deal = await Deal.findOne({
    _id: dealId,
    influencerUserId: userId,
  });

  if (!deal) {
    throw new NotFoundError("Deal offer not found");
  }

  deal.counterOffer = {
    counterAmount,
    termsNote: termsNote || "",
    proposedAt: new Date(),
    status: "pending",
  };
  deal.status = "counter_offered";
  deal.actionRequired = false;
  await deal.save();

  emitDealStatusChanged({
    dealId: toId(deal._id),
    influencerUserId: toId(deal.influencerUserId),
    brandUserId: toId(deal.brandUserId),
    status: "counter_offered",
    deal,
  });

  return {
    deal: {
      ...deal.toObject(),
      id: toId(deal._id),
    },
  };
};

export const submitMilestoneDraft = async ({
  user,
  dealId,
  milestoneId,
  body,
}) => {
  const userId = toId(user.userId);
  const { draftUrl, notes } = body || {};

  if (!draftUrl) {
    throw new ValidationError("draftUrl is required");
  }

  const deal = await Deal.findOne({
    _id: dealId,
    influencerUserId: userId,
  });

  if (!deal) {
    throw new NotFoundError("Deal not found");
  }

  // Find milestone by _id or index
  let milestone = deal.milestones.id(milestoneId);
  if (!milestone && deal.milestones.length > 0) {
    const idx = parseInt(milestoneId, 10);
    if (!isNaN(idx) && deal.milestones[idx]) {
      milestone = deal.milestones[idx];
    } else {
      milestone = deal.milestones[0];
    }
  }

  if (!milestone) {
    throw new NotFoundError("Milestone not found in deal");
  }

  milestone.draftUrl = draftUrl;
  milestone.draftNotes = notes || "";
  milestone.submittedAt = new Date();
  milestone.status = "draft_submitted";

  // Recalculate completion percentage
  const completedOrSubmitted = deal.milestones.filter((m) =>
    ["draft_submitted", "approved", "released"].includes(m.status)
  ).length;
  deal.completionPercentage = Math.round(
    (completedOrSubmitted / deal.milestones.length) * 100
  );

  await deal.save();

  emitDealStatusChanged({
    dealId: toId(deal._id),
    influencerUserId: toId(deal.influencerUserId),
    brandUserId: toId(deal.brandUserId),
    status: "draft_submitted",
    deal,
    milestone,
  });

  return {
    deal: {
      ...deal.toObject(),
      id: toId(deal._id),
    },
    milestone,
  };
};
