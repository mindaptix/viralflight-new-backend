import Collaboration from "../../../models/Collaboration.js";
import Campaign from "../../../models/Campaign.js";
import InfluencerProfile from "../../../models/InfluencerProfile.js";
import BrandProfile from "../../../models/BrandProfile.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess, sendFailure } from "../../../shared/http/respond.js";

const toId = (v) => (v ? String(v) : "");

// Build the user-scoped filter based on role
const buildFilter = (user, extra = {}) => {
  const userId = toId(user.userId);
  const role = user.role;

  const roleFilter =
    role === "brand"
      ? { brandUserId: userId }
      : role === "agency"
      ? { agencyUserId: userId }
      : { influencerUserId: userId }; // influencer

  return { ...roleFilter, ...extra };
};

// ─── 1. List My Collaborations ────────────────────────────────────────────────
export const listCollaborations = asyncHandler(async (req, res) => {
  const {
    status,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const filter = buildFilter(req.user);
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const sortDir = sortOrder === "asc" ? 1 : -1;

  const [collabs, total] = await Promise.all([
    Collaboration.find(filter)
      .sort({ [sortBy]: sortDir })
      .skip(skip)
      .limit(Number(limit))
      .populate("campaignId", "title coverImageUrl status category")
      .lean(),
    Collaboration.countDocuments(filter),
  ]);

  // Enrich with brand / influencer name
  const enriched = await Promise.all(
    collabs.map(async (c) => {
      let brandName = null;
      let influencerName = null;

      try {
        if (c.brandUserId) {
          const bp = await BrandProfile.findOne({
            userId: c.brandUserId,
          })
            .select("brandName contactPerson")
            .lean();
          brandName = bp?.brandName || bp?.contactPerson || null;
        }
        if (c.influencerProfileId) {
          const ip = await InfluencerProfile.findById(c.influencerProfileId)
            .select("displayName username instagramHandle profileImageUrl")
            .lean();
          influencerName =
            ip?.displayName || ip?.username || ip?.instagramHandle || null;
        }
      } catch (_) {}

      return {
        id: toId(c._id),
        title: c.title || c.campaignId?.title || "Collaboration",
        status: c.status,
        campaign: c.campaignId
          ? {
              id: toId(c.campaignId._id),
              title: c.campaignId.title,
              coverImageUrl: c.campaignId.coverImageUrl || null,
              status: c.campaignId.status,
              category: c.campaignId.category,
            }
          : null,
        brandUserId: toId(c.brandUserId),
        influencerProfileId: toId(c.influencerProfileId),
        brandName,
        influencerName,
        startedAt: c.startedAt,
        endedAt: c.endedAt || null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    })
  );

  sendSuccess(res, {
    message: "Collaborations fetched successfully",
    collaborations: enriched,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
    hasMore: skip + collabs.length < total,
  });
});

// ─── 2. Get Single Collaboration ──────────────────────────────────────────────
export const getCollaboration = asyncHandler(async (req, res) => {
  const { collaborationId } = req.params;
  const userId = toId(req.user.userId);
  const role = req.user.role;

  const collab = await Collaboration.findById(collaborationId)
    .populate("campaignId", "title description coverImageUrl status category budgetAmount budgetCurrency platforms deliverables applicationDeadline")
    .lean();

  if (!collab) {
    return sendFailure(res, { statusCode: 404, message: "Collaboration not found" });
  }

  // Access control: only participants can view
  const isBrand = toId(collab.brandUserId) === userId;
  const isInfluencer = toId(collab.influencerUserId) === userId;
  const isAgency = toId(collab.agencyUserId) === userId;

  if (!isBrand && !isInfluencer && !isAgency) {
    return sendFailure(res, {
      statusCode: 403,
      message: "Access denied",
    });
  }

  let brandName = null;
  let influencerName = null;
  let influencerAvatar = null;

  try {
    if (collab.brandUserId) {
      const bp = await BrandProfile.findOne({ userId: collab.brandUserId })
        .select("brandName profileImageUrl")
        .lean();
      brandName = bp?.brandName || null;
    }
    if (collab.influencerProfileId) {
      const ip = await InfluencerProfile.findById(collab.influencerProfileId)
        .select("displayName username instagramHandle profileImageUrl followerCount niche")
        .lean();
      influencerName =
        ip?.displayName || ip?.username || ip?.instagramHandle || null;
      influencerAvatar = ip?.profileImageUrl || null;
    }
  } catch (_) {}

  sendSuccess(res, {
    message: "Collaboration fetched successfully",
    collaboration: {
      id: toId(collab._id),
      title: collab.title || collab.campaignId?.title || "Collaboration",
      status: collab.status,
      campaign: collab.campaignId,
      brandUserId: toId(collab.brandUserId),
      influencerProfileId: toId(collab.influencerProfileId),
      brandName,
      influencerName,
      influencerAvatar,
      startedAt: collab.startedAt,
      endedAt: collab.endedAt || null,
      createdAt: collab.createdAt,
      updatedAt: collab.updatedAt,
    },
  });
});
