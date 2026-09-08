import AgencyProfile from "../../../models/AgencyProfile.js";
import InfluencerProfile from "../../../models/InfluencerProfile.js";
import Campaign from "../../../models/Campaign.js";
import CampaignApplication from "../../../models/CampaignApplication.js";
import Conversation from "../../../models/Conversation.js";
import Deal from "../../../models/Deal.js";
import Collaboration from "../../../models/Collaboration.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess, sendFailure } from "../../../shared/http/respond.js";
import { getOrCreateRoleProfile } from "../../../utils/profileControllerUtils.js";

const toId = (v) => (v ? String(v) : "");

const getAgencyProfileOrFail = async (user) => {
  const profile = await AgencyProfile.findOne({
    $or: [{ userId: user.userId }, { mobile: user.mobile }],
  });
  return profile;
};

// ─── 1. Agency Dashboard Stats ───────────────────────────────────────────────
export const getAgencyDashboardStats = asyncHandler(async (req, res) => {
  const userId = toId(req.user.userId);

  const profile = await getAgencyProfileOrFail(req.user);
  const talentCount = profile ? profile.talent.filter((t) => t.status === "active").length : 0;

  const [activeCampaigns, totalCampaigns, pendingApplications, activeCollabs] =
    await Promise.all([
      Campaign.countDocuments({
        $or: [{ agencyUserId: userId }, { ownerUserId: userId }],
        status: "active",
      }),
      Campaign.countDocuments({
        $or: [{ agencyUserId: userId }, { ownerUserId: userId }],
      }),
      CampaignApplication.countDocuments({
        campaignId: {
          $in: await Campaign.find({
            $or: [{ agencyUserId: userId }, { ownerUserId: userId }],
          }).distinct("_id"),
        },
        status: "applied",
      }),
      Collaboration.countDocuments({ agencyUserId: userId, status: "active" }),
    ]);

  // Deals / escrow
  let activeDeals = 0;
  let escrowBalance = 0;
  try {
    const deals = await Deal.find({
      $or: [{ agencyUserId: userId }, { agencyId: userId }],
    }).lean();
    activeDeals = deals.filter((d) => d.status === "active").length;
    escrowBalance = deals
      .filter((d) => d.status === "active")
      .reduce((s, d) => s + (d.escrowLockedAmount || 0), 0);
  } catch (_) {}

  const formatINR = (n) =>
    n >= 100000
      ? `₹${(n / 100000).toFixed(1)}L`
      : n >= 1000
      ? `₹${(n / 1000).toFixed(0)}K`
      : `₹${n}`;

  sendSuccess(res, {
    message: "Agency dashboard stats fetched successfully",
    data: {
      talentCount,
      activeCampaigns,
      totalCampaigns,
      pendingApplications,
      activeCollaborations: activeCollabs,
      activeDeals,
      escrowBalance: formatINR(escrowBalance),
      escrowBalanceRaw: escrowBalance,
    },
    // Flat keys for easy Flutter parsing
    talentCount,
    activeCampaigns,
    pendingApplications,
    activeDeals,
    escrowBalance: formatINR(escrowBalance),
  });
});

// ─── 2. Get Talent Roster ────────────────────────────────────────────────────
export const getTalentRoster = asyncHandler(async (req, res) => {
  const profile = await getAgencyProfileOrFail(req.user);

  if (!profile) {
    return sendSuccess(res, {
      message: "Talent roster fetched",
      talent: [],
      total: 0,
    });
  }

  const { status, page = 1, limit = 20 } = req.query;
  let roster = profile.talent;

  if (status) {
    roster = roster.filter((t) => t.status === status);
  }

  const total = roster.length;
  const start = (Number(page) - 1) * Number(limit);
  const paged = roster.slice(start, start + Number(limit));

  // Enrich with InfluencerProfile details for non-stub entries
  const enriched = await Promise.all(
    paged.map(async (entry) => {
      let extra = {};
      if (entry.influencerProfileId) {
        try {
          const inf = await InfluencerProfile.findById(
            entry.influencerProfileId
          )
            .select(
              "displayName username instagramHandle followerCount niche profileImageUrl city avgEngagementRate"
            )
            .lean();
          if (inf) {
            extra = {
              displayName: inf.displayName || inf.username || entry.name,
              instagramHandle: inf.instagramHandle || entry.instagramHandle,
              followerCount: inf.followerCount || 0,
              niche: inf.niche || entry.niche,
              avatarUrl: inf.profileImageUrl || null,
              city: inf.city || entry.city,
              avgEngagementRate: inf.avgEngagementRate || 0,
            };
          }
        } catch (_) {}
      }
      return {
        id: toId(entry._id),
        influencerProfileId: toId(entry.influencerProfileId),
        name: entry.name || extra.displayName || "—",
        instagramHandle: extra.instagramHandle || entry.instagramHandle || "—",
        city: extra.city || entry.city || "—",
        niche: extra.niche || entry.niche || "—",
        followerCount: extra.followerCount || 0,
        avgEngagementRate: extra.avgEngagementRate || 0,
        avatarUrl: extra.avatarUrl || null,
        status: entry.status || "active",
        addedAt: entry.addedAt,
      };
    })
  );

  sendSuccess(res, {
    message: "Talent roster fetched successfully",
    talent: enriched,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
  });
});

// ─── 3. Add Talent to Roster ─────────────────────────────────────────────────
export const addTalentToRoster = asyncHandler(async (req, res) => {
  const profile = await getOrCreateRoleProfile(req.user, AgencyProfile);
  const body = req.body || {};

  const {
    influencerProfileId,
    influencerUserId,
    name,
    instagramHandle,
    city,
    niche,
  } = body;

  if (!influencerProfileId && !name) {
    return sendFailure(res, {
      statusCode: 400,
      message: "influencerProfileId or name is required",
    });
  }

  // Prevent duplicates
  if (influencerProfileId) {
    const already = profile.talent.some(
      (t) =>
        toId(t.influencerProfileId) === toId(influencerProfileId) &&
        t.status !== "inactive"
    );
    if (already) {
      return sendFailure(res, {
        statusCode: 409,
        message: "This influencer is already in your roster",
      });
    }
  }

  const entry = {
    influencerProfileId: influencerProfileId || undefined,
    influencerUserId: influencerUserId || undefined,
    name,
    instagramHandle,
    city,
    niche,
    status: "active",
    addedAt: new Date(),
  };

  profile.talent.push(entry);
  await profile.save();

  sendSuccess(res, {
    message: "Talent added to roster successfully",
    talent: entry,
  });
});

// ─── 4. Remove Talent from Roster ────────────────────────────────────────────
export const removeTalentFromRoster = asyncHandler(async (req, res) => {
  const profile = await getAgencyProfileOrFail(req.user);

  if (!profile) {
    return sendFailure(res, { statusCode: 404, message: "Agency profile not found" });
  }

  const { talentId } = req.params;

  const idx = profile.talent.findIndex((t) => toId(t._id) === talentId);
  if (idx === -1) {
    return sendFailure(res, { statusCode: 404, message: "Talent not found in roster" });
  }

  profile.talent[idx].status = "inactive";
  profile.markModified("talent");
  await profile.save();

  sendSuccess(res, {
    message: "Talent removed from roster",
    talentId,
  });
});

// ─── 5. Get Agency Deals ─────────────────────────────────────────────────────
export const getAgencyDeals = asyncHandler(async (req, res) => {
  const userId = toId(req.user.userId);
  const { status, page = 1, limit = 20 } = req.query;

  let deals = [];
  let total = 0;

  try {
    const filter = {
      $or: [{ agencyUserId: userId }, { agencyId: userId }],
    };
    if (status) filter.status = status;

    total = await Deal.countDocuments(filter);
    deals = await Deal.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();
  } catch (_) {
    // Deal model not fully populated — return empty
  }

  const formatINR = (n) =>
    n >= 100000
      ? `₹${(n / 100000).toFixed(1)}L`
      : n >= 1000
      ? `₹${(n / 1000).toFixed(0)}K`
      : `₹${n}`;

  sendSuccess(res, {
    message: "Agency deals fetched successfully",
    deals: deals.map((d) => ({
      id: toId(d._id),
      title: d.title || d.dealTitle || "Deal",
      status: d.status,
      amount: formatINR(d.amount || 0),
      amountRaw: d.amount || 0,
      influencerName: d.influencerName || "Creator",
      brandName: d.brandName || "Brand",
      campaignTitle: d.campaignTitle || null,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
  });
});

// ─── 6. Get Agency Negotiations ──────────────────────────────────────────────
export const getAgencyNegotiations = asyncHandler(async (req, res) => {
  const userId = toId(req.user.userId);
  const { page = 1, limit = 20 } = req.query;

  const total = await Conversation.countDocuments({
    participants: userId,
    campaignId: { $ne: null },
  });

  const negotiations = await Conversation.find({
    participants: userId,
    campaignId: { $ne: null },
  })
    .sort({ lastMessageAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .populate("campaignId", "title coverImageUrl status")
    .lean();

  sendSuccess(res, {
    message: "Agency negotiations fetched successfully",
    negotiations: negotiations.map((n) => ({
      id: toId(n._id),
      campaignId: toId(n.campaignId?._id),
      campaignTitle: n.campaignId?.title || n.campaignTitle || "Campaign",
      campaignStatus: n.campaignId?.status || "active",
      status: n.status,
      lastMessage: n.lastMessage?.text || "",
      lastMessageAt: n.lastMessageAt,
      participants: (n.participants || []).map(toId),
      unreadCount: n.unreadCounts?.get?.(userId) || 0,
    })),
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
  });
});

// ─── 7. Agency HQ ────────────────────────────────────────────────────────────
export const getAgencyHq = asyncHandler(async (req, res) => {
  const profile = await getAgencyProfileOrFail(req.user);

  if (!profile) {
    return sendFailure(res, { statusCode: 404, message: "Agency profile not found" });
  }

  const talentCount = profile.talent.filter((t) => t.status === "active").length;

  sendSuccess(res, {
    message: "Agency HQ fetched successfully",
    data: {
      // Team summary
      team: {
        agencyName: profile.agencyName,
        agencyType: profile.agencyType,
        teamSize: profile.teamSize,
        creatorsManaged: profile.creatorsManaged,
        rosterSize: profile.rosterSize,
        talentCount,
      },
      // Compliance
      compliance: {
        gstNumber: profile.gstNumber || null,
        gstVerified: profile.gstVerified || false,
        termsAuthorized: profile.termsAuthorized || false,
        includeGst: profile.includeGst || false,
        multiTalentDiscount: profile.multiTalentDiscount || false,
      },
      // Settings
      settings: {
        representedNiches: profile.representedNiches || [],
        focusAreas: profile.focusAreas || [],
        website: profile.website || null,
        contactName: profile.contactName || null,
        city: profile.city || null,
      },
      // Onboarding step
      onboardingStep: profile.isProfileComplete ? "completed" : "basic",
    },
  });
});
