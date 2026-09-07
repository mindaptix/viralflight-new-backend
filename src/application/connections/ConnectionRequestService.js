import mongoose from "mongoose";

import AgencyProfile from "../../models/AgencyProfile.js";
import BrandProfile from "../../models/BrandProfile.js";
import ConnectionRequest, {
  CONNECTION_REQUEST_KINDS,
  CONNECTION_REQUEST_STATUSES,
} from "../../models/ConnectionRequest.js";
import InfluencerProfile from "../../models/InfluencerProfile.js";
import Notification from "../../models/Notification.js";
import User from "../../models/User.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors/AppError.js";

const toId = (val) => (val ? String(val) : "");

const mapConnectionRequestData = (doc, isIncoming = false) => ({
  id: toId(doc._id),
  kind: doc.kind,
  status: doc.status,
  ...(typeof isIncoming === "boolean" ? { is_incoming: isIncoming } : {}),
  creator_id: toId(doc.creatorId || doc.creatorProfileId),
  brand_id: toId(doc.brandId),
  brand_name: doc.brandName || "",
  brand_niche: doc.brandNiche || "",
  message: doc.message || "",
  budget_display: doc.budgetDisplay ?? null,
  deliverable: doc.deliverable ?? null,
  city: doc.city ?? null,
  created_at: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
});

const resolveCreator = async (creatorIdentifier) => {
  if (!creatorIdentifier) {
    throw new ValidationError("creator_id is required");
  }

  if (!mongoose.Types.ObjectId.isValid(creatorIdentifier)) {
    throw new ValidationError("Valid creator_id is required");
  }

  // 1. Try finding InfluencerProfile by ID
  let profile = await InfluencerProfile.findById(creatorIdentifier);
  if (profile) {
    let creatorUserId = profile.userId;
    if (!creatorUserId && profile.mobile) {
      const user = await User.findOne({ mobile: profile.mobile, role: "influencer" });
      if (user) {
        creatorUserId = user._id;
      }
    }

    return {
      creatorId: creatorUserId || profile._id,
      creatorProfileId: profile._id,
      creatorMobile: profile.mobile || "",
      creatorCity: profile.city || "",
      profile,
    };
  }

  // 2. Try finding User by ID
  const user = await User.findById(creatorIdentifier);
  if (user) {
    profile = await InfluencerProfile.findOne({
      $or: [{ userId: user._id }, { mobile: user.mobile }],
    });

    return {
      creatorId: user._id,
      creatorProfileId: profile?._id,
      creatorMobile: user.mobile || profile?.mobile || "",
      creatorCity: profile?.city || "",
      profile,
    };
  }

  throw new NotFoundError("Creator not found");
};

const resolveBrandInfo = async (user, body) => {
  let brandName = typeof body.brand_name === "string" ? body.brand_name.trim() : (body.brandName || "").trim();
  let brandNiche = typeof body.brand_niche === "string" ? body.brand_niche.trim() : (body.brandNiche || "").trim();

  if (!brandName || !brandNiche) {
    if (user.role === "brand") {
      const profile = await BrandProfile.findOne({
        $or: [{ userId: user.userId }, { mobile: user.mobile }],
      });
      if (profile) {
        if (!brandName) brandName = profile.brandName || "";
        if (!brandNiche) brandNiche = profile.industry || "";
      }
    } else if (user.role === "agency") {
      const profile = await AgencyProfile.findOne({
        $or: [{ userId: user.userId }, { mobile: user.mobile }],
      });
      if (profile) {
        if (!brandName) brandName = profile.agencyName || "";
        if (!brandNiche) {
          brandNiche = Array.isArray(profile.niches) && profile.niches.length > 0
            ? profile.niches.join(", ")
            : profile.agencyType || "";
        }
      }
    }
  }

  if (!brandName) {
    brandName = user.role === "brand" ? "Brand" : "Agency";
  }

  return { brandName, brandNiche };
};

export const createConnectionRequest = async ({ user, body = {} }) => {
  if (!["brand", "agency"].includes(user.role)) {
    throw new ForbiddenError("Only brand or agency accounts can initiate requests");
  }

  const creatorIdentifier =
    body.creator_id ||
    body.creatorId ||
    body.influencerProfileId ||
    body.influencerId ||
    body.profileId;

  const { creatorId, creatorProfileId, creatorMobile, creatorCity, profile } =
    await resolveCreator(creatorIdentifier);

  const rawKind = (body.kind || "quote").toLowerCase().trim();
  if (!CONNECTION_REQUEST_KINDS.includes(rawKind)) {
    throw new ValidationError(`kind must be one of: ${CONNECTION_REQUEST_KINDS.join(", ")}`);
  }

  const { brandName, brandNiche } = await resolveBrandInfo(user, body);

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const budgetDisplay =
    body.budget_display !== undefined && body.budget_display !== null
      ? String(body.budget_display).trim()
      : body.budgetDisplay !== undefined && body.budgetDisplay !== null
        ? String(body.budgetDisplay).trim()
        : null;

  const deliverable =
    body.deliverable !== undefined && body.deliverable !== null
      ? String(body.deliverable).trim()
      : Array.isArray(body.deliverables)
        ? body.deliverables.join(", ")
        : null;

  const city =
    typeof body.city === "string" && body.city.trim()
      ? body.city.trim()
      : creatorCity || null;

  const connectionRequest = await ConnectionRequest.create({
    creatorId,
    creatorProfileId,
    creatorMobile,
    brandId: user.userId,
    brandRole: user.role,
    brandName,
    brandNiche,
    kind: rawKind,
    message,
    budgetDisplay,
    deliverable,
    city,
    status: "pending",
  });

  // Creator in-app notification
  const notifyUserId =
    profile?.userId || (mongoose.Types.ObjectId.isValid(creatorId) ? creatorId : null);

  if (notifyUserId) {
    const isQuote = rawKind === "quote";
    const notificationTitle = isQuote ? "New Quote Request" : "New Connection Request";
    const notificationBody =
      message || `${brandName} sent you a ${isQuote ? "quote request" : "connection request"}.`;

    await Notification.create({
      userId: notifyUserId,
      role: "influencer",
      title: notificationTitle,
      body: notificationBody,
      type: isQuote ? "quote_request" : "connection_request",
      targetId: toId(connectionRequest._id),
      metadata: {
        requestId: toId(connectionRequest._id),
        kind: rawKind,
        brandId: toId(user.userId),
        brandName,
        budgetDisplay,
        deliverable,
      },
    });
  }

  return {
    data: mapConnectionRequestData(connectionRequest, false),
  };
};

export const listUserConnectionRequests = async ({ user, query = {} }) => {
  const isCreator = user.role === "influencer";
  const isBrandOrAgency = ["brand", "agency"].includes(user.role);

  if (!isCreator && !isBrandOrAgency) {
    throw new ForbiddenError("Unsupported user role");
  }

  const filter = {};

  if (isCreator) {
    const profile = await InfluencerProfile.findOne({
      $or: [{ userId: user.userId }, { mobile: user.mobile }],
    });

    const orConditions = [
      { creatorId: user.userId },
      { creatorMobile: user.mobile },
    ];
    if (profile?._id) {
      orConditions.push({ creatorProfileId: profile._id });
    }
    filter.$or = orConditions;
  } else {
    filter.brandId = user.userId;
  }

  // Kind / Type filter
  const typeParam = (query.type || query.kind || "").toLowerCase().trim();
  if (typeParam === "quotes" || typeParam === "quote") {
    filter.kind = "quote";
  } else if (typeParam === "connections" || typeParam === "connection") {
    filter.kind = "connection";
  }

  // Status filter
  const statusParam = (query.status || "").toLowerCase().trim();
  if (statusParam && CONNECTION_REQUEST_STATUSES.includes(statusParam)) {
    filter.status = statusParam;
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [total, docs] = await Promise.all([
    ConnectionRequest.countDocuments(filter),
    ConnectionRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    data: docs.map((doc) => mapConnectionRequestData(doc, isCreator)),
    pagination: {
      total,
      page,
      limit,
    },
  };
};

export const updateConnectionRequestStatus = async ({
  user,
  requestId,
  body = {},
}) => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new ValidationError("Valid request id is required");
  }

  const nextStatus = (body.status || "").toLowerCase().trim();
  const allowedStatuses = ["accepted", "declined", "disconnected"];

  if (!allowedStatuses.includes(nextStatus)) {
    throw new ValidationError(
      `status must be one of: ${allowedStatuses.join(", ")}`
    );
  }

  const doc = await ConnectionRequest.findById(requestId);
  if (!doc) {
    throw new NotFoundError("Connection request not found");
  }

  const isCreator =
    user.role === "influencer" &&
    (toId(doc.creatorId) === toId(user.userId) ||
      doc.creatorMobile === user.mobile);

  let creatorMatchesProfile = false;
  if (user.role === "influencer" && !isCreator && doc.creatorProfileId) {
    const profile = await InfluencerProfile.findOne({
      $or: [{ userId: user.userId }, { mobile: user.mobile }],
    });
    if (profile && toId(profile._id) === toId(doc.creatorProfileId)) {
      creatorMatchesProfile = true;
    }
  }

  const isBrand =
    ["brand", "agency"].includes(user.role) &&
    toId(doc.brandId) === toId(user.userId);

  if (!isCreator && !creatorMatchesProfile && !isBrand) {
    throw new ForbiddenError("You are not authorized to update this request");
  }

  doc.status = nextStatus;
  await doc.save();

  // Send status update notification to other party
  if (isCreator || creatorMatchesProfile) {
    // Notify Brand/Agency
    if (doc.brandId) {
      await Notification.create({
        userId: doc.brandId,
        role: doc.brandRole,
        title: `Request ${nextStatus}`,
        body: `Creator has ${nextStatus} your ${doc.kind} request.`,
        type: doc.kind === "quote" ? "quote_request" : "connection_request",
        targetId: toId(doc._id),
        metadata: {
          requestId: toId(doc._id),
          status: nextStatus,
        },
      });
    }
  } else if (isBrand) {
    // Notify Creator
    const notifyCreatorUserId =
      mongoose.Types.ObjectId.isValid(doc.creatorId) ? doc.creatorId : null;
    if (notifyCreatorUserId) {
      await Notification.create({
        userId: notifyCreatorUserId,
        role: "influencer",
        title: `Request ${nextStatus}`,
        body: `${doc.brandName || "Brand"} has updated the ${doc.kind} request to ${nextStatus}.`,
        type: doc.kind === "quote" ? "quote_request" : "connection_request",
        targetId: toId(doc._id),
        metadata: {
          requestId: toId(doc._id),
          status: nextStatus,
        },
      });
    }
  }

  return {
    message: `Request status updated to ${nextStatus}`,
    data: {
      id: toId(doc._id),
      status: doc.status,
      updated_at: doc.updatedAt
        ? new Date(doc.updatedAt).toISOString()
        : new Date().toISOString(),
    },
  };
};

export const getConnectionRequestById = async ({ user, requestId }) => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new ValidationError("Valid request id is required");
  }

  const doc = await ConnectionRequest.findById(requestId).lean();
  if (!doc) {
    throw new NotFoundError("Connection request not found");
  }

  const isCreator =
    user.role === "influencer" &&
    (toId(doc.creatorId) === toId(user.userId) ||
      doc.creatorMobile === user.mobile);

  let creatorMatchesProfile = false;
  if (user.role === "influencer" && !isCreator && doc.creatorProfileId) {
    const profile = await InfluencerProfile.findOne({
      $or: [{ userId: user.userId }, { mobile: user.mobile }],
    });
    if (profile && toId(profile._id) === toId(doc.creatorProfileId)) {
      creatorMatchesProfile = true;
    }
  }

  const isBrand =
    ["brand", "agency"].includes(user.role) &&
    toId(doc.brandId) === toId(user.userId);

  if (!isCreator && !creatorMatchesProfile && !isBrand) {
    throw new ForbiddenError("Not authorized to view this request");
  }

  return {
    data: mapConnectionRequestData(doc, isCreator || creatorMatchesProfile),
  };
};
