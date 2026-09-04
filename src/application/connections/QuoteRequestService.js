import mongoose from "mongoose";

import InfluencerProfile from "../../models/InfluencerProfile.js";
import Notification from "../../models/Notification.js";
import QuoteRequest from "../../models/QuoteRequest.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors/AppError.js";

const toId = (value) => String(value);

const mapQuoteRequest = (doc, influencerProfile) => ({
  id: toId(doc._id),
  status: doc.status,
  message: doc.message || "",
  deliverables: Array.isArray(doc.deliverables) ? doc.deliverables : [],
  budgetHint: doc.budgetHint ?? null,
  currency: doc.currency || "INR",
  quotedAmount: doc.quotedAmount ?? null,
  quotedCurrency: doc.quotedCurrency || doc.currency || "INR",
  quotedNote: doc.quotedNote || "",
  quotedAt: doc.quotedAt || null,
  validityDays: doc.validityDays ?? null,
  respondedAt: doc.respondedAt || null,
  campaignId: doc.campaignId ? toId(doc.campaignId) : null,
  requesterUserId: toId(doc.requesterUserId),
  requesterRole: doc.requesterRole,
  influencerProfileId: toId(doc.influencerProfileId),
  influencer: influencerProfile
    ? {
        id: toId(influencerProfile._id),
        name: influencerProfile.name || "",
        city: influencerProfile.city || "",
        profileImageUrl: influencerProfile.profileImageUrl || "",
        instagramHandle:
          influencerProfile.instagramHandle ||
          influencerProfile.instagram?.handle ||
          "",
      }
    : null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const requireBrandOrAgency = (user) => {
  if (!["brand", "agency"].includes(user.role)) {
    throw new ForbiddenError("Only brand or agency accounts can request quotes");
  }
};

const findInfluencerProfile = async (influencerProfileId) => {
  if (!mongoose.Types.ObjectId.isValid(influencerProfileId)) {
    throw new ValidationError("Valid influencerProfileId is required");
  }

  const profile = await InfluencerProfile.findById(influencerProfileId);
  if (!profile) {
    throw new NotFoundError("Influencer profile not found");
  }

  return profile;
};

const normalizeDeliverables = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

export const createQuoteRequest = async ({ user, body = {} }) => {
  requireBrandOrAgency(user);

  const influencerProfileId =
    body.influencerProfileId || body.profileId || body.influencerId;
  const profile = await findInfluencerProfile(influencerProfileId);
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const deliverables = normalizeDeliverables(body.deliverables);
  const budgetHint =
    body.budgetHint !== undefined && body.budgetHint !== null && body.budgetHint !== ""
      ? Number(body.budgetHint)
      : undefined;
  const currency =
    (typeof body.currency === "string" && body.currency.trim().toUpperCase()) ||
    "INR";
  const campaignId =
    body.campaignId && mongoose.Types.ObjectId.isValid(body.campaignId)
      ? body.campaignId
      : undefined;

  if (budgetHint !== undefined && Number.isNaN(budgetHint)) {
    throw new ValidationError("budgetHint must be a number");
  }

  const pending = await QuoteRequest.findOne({
    requesterUserId: user.userId,
    influencerProfileId: profile._id,
    status: { $in: ["pending", "quoted"] },
  });

  if (pending) {
    throw new ConflictError(
      "You already have an open quote request with this influencer"
    );
  }

  const quoteRequest = await QuoteRequest.create({
    requesterUserId: user.userId,
    requesterRole: user.role,
    requesterMobile: user.mobile,
    influencerProfileId: profile._id,
    influencerUserId: profile.userId,
    influencerMobile: profile.mobile,
    campaignId,
    message,
    deliverables,
    budgetHint,
    currency,
    status: "pending",
  });

  if (profile.userId) {
    await Notification.create({
      userId: profile.userId,
      role: "influencer",
      title: "New quote request",
      body: message || `A ${user.role} requested a quote from you`,
      type: "general",
      targetId: toId(quoteRequest._id),
      metadata: {
        quoteRequestId: toId(quoteRequest._id),
        requesterUserId: toId(user.userId),
        requesterRole: user.role,
      },
    });
  }

  return {
    message: "Quote request sent",
    quoteRequest: mapQuoteRequest(quoteRequest, profile),
  };
};

export const listQuoteRequests = async ({ user, query = {} }) => {
  const status = typeof query.status === "string" ? query.status.trim() : "";
  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (user.role === "influencer") {
    filter.$or = [
      { influencerUserId: user.userId },
      { influencerMobile: user.mobile },
    ];
  } else if (["brand", "agency"].includes(user.role)) {
    filter.requesterUserId = user.userId;
  } else {
    throw new ForbiddenError("Unsupported role for quote requests");
  }

  const docs = await QuoteRequest.find(filter).sort({ createdAt: -1 }).lean();
  const profileIds = [
    ...new Set(docs.map((item) => toId(item.influencerProfileId))),
  ];
  const profiles = await InfluencerProfile.find({
    _id: { $in: profileIds },
  }).lean();
  const profileMap = new Map(profiles.map((item) => [toId(item._id), item]));

  return {
    count: docs.length,
    quoteRequests: docs.map((item) =>
      mapQuoteRequest(item, profileMap.get(toId(item.influencerProfileId)))
    ),
  };
};

export const getQuoteRequest = async ({ user, quoteRequestId }) => {
  if (!mongoose.Types.ObjectId.isValid(quoteRequestId)) {
    throw new ValidationError("Valid quoteRequestId is required");
  }

  const doc = await QuoteRequest.findById(quoteRequestId);
  if (!doc) {
    throw new NotFoundError("Quote request not found");
  }

  const isRequester = toId(doc.requesterUserId) === toId(user.userId);
  const isInfluencer =
    user.role === "influencer" &&
    (toId(doc.influencerUserId) === toId(user.userId) ||
      doc.influencerMobile === user.mobile);

  if (!isRequester && !isInfluencer) {
    throw new ForbiddenError("Not allowed to view this quote request");
  }

  const profile = await InfluencerProfile.findById(doc.influencerProfileId).lean();
  return { quoteRequest: mapQuoteRequest(doc, profile) };
};

export const respondToQuoteRequest = async ({ user, quoteRequestId, body = {} }) => {
  if (user.role !== "influencer") {
    throw new ForbiddenError("Only influencers can respond with a quote");
  }

  if (!mongoose.Types.ObjectId.isValid(quoteRequestId)) {
    throw new ValidationError("Valid quoteRequestId is required");
  }

  const doc = await QuoteRequest.findById(quoteRequestId);
  if (!doc) {
    throw new NotFoundError("Quote request not found");
  }

  const ownsRequest =
    toId(doc.influencerUserId) === toId(user.userId) ||
    doc.influencerMobile === user.mobile;

  if (!ownsRequest) {
    throw new ForbiddenError("Not allowed to respond to this quote request");
  }

  if (!["pending", "quoted"].includes(doc.status)) {
    throw new ConflictError(`Cannot quote a request in status ${doc.status}`);
  }

  const amount = Number(body.quotedAmount ?? body.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new ValidationError("quotedAmount is required and must be >= 0");
  }

  doc.quotedAmount = amount;
  doc.quotedCurrency =
    (typeof body.currency === "string" && body.currency.trim().toUpperCase()) ||
    doc.currency ||
    "INR";
  doc.quotedNote =
    typeof body.note === "string"
      ? body.note.trim()
      : typeof body.quotedNote === "string"
        ? body.quotedNote.trim()
        : "";
  doc.validityDays =
    body.validityDays !== undefined && body.validityDays !== null
      ? Number(body.validityDays)
      : doc.validityDays;
  doc.quotedAt = new Date();
  doc.respondedAt = new Date();
  doc.status = "quoted";
  await doc.save();

  await Notification.create({
    userId: doc.requesterUserId,
    role: doc.requesterRole,
    title: "Quote received",
    body: `Influencer quoted ${doc.quotedCurrency} ${doc.quotedAmount}`,
    type: "general",
    targetId: toId(doc._id),
    metadata: {
      quoteRequestId: toId(doc._id),
      quotedAmount: doc.quotedAmount,
      quotedCurrency: doc.quotedCurrency,
    },
  });

  const profile = await InfluencerProfile.findById(doc.influencerProfileId).lean();
  return {
    message: "Quote submitted",
    quoteRequest: mapQuoteRequest(doc, profile),
  };
};

export const updateQuoteRequestStatus = async ({
  user,
  quoteRequestId,
  action,
}) => {
  if (!mongoose.Types.ObjectId.isValid(quoteRequestId)) {
    throw new ValidationError("Valid quoteRequestId is required");
  }

  const doc = await QuoteRequest.findById(quoteRequestId);
  if (!doc) {
    throw new NotFoundError("Quote request not found");
  }

  const isRequester = toId(doc.requesterUserId) === toId(user.userId);
  const isInfluencer =
    user.role === "influencer" &&
    (toId(doc.influencerUserId) === toId(user.userId) ||
      doc.influencerMobile === user.mobile);

  let nextStatus;
  let message;

  if (action === "accept") {
    if (!isRequester) {
      throw new ForbiddenError("Only the requester can accept a quote");
    }
    if (doc.status !== "quoted") {
      throw new ConflictError("Only quoted requests can be accepted");
    }
    nextStatus = "accepted";
    message = "Quote accepted";
  } else if (action === "decline") {
    if (!isRequester && !isInfluencer) {
      throw new ForbiddenError("Not allowed to decline this quote request");
    }
    if (!["pending", "quoted"].includes(doc.status)) {
      throw new ConflictError(`Cannot decline a request in status ${doc.status}`);
    }
    nextStatus = "declined";
    message = "Quote request declined";
  } else if (action === "withdraw") {
    if (!isRequester) {
      throw new ForbiddenError("Only the requester can withdraw a quote request");
    }
    if (!["pending", "quoted"].includes(doc.status)) {
      throw new ConflictError(`Cannot withdraw a request in status ${doc.status}`);
    }
    nextStatus = "withdrawn";
    message = "Quote request withdrawn";
  } else {
    throw new ValidationError("Invalid action");
  }

  doc.status = nextStatus;
  doc.respondedAt = new Date();
  await doc.save();

  const notifyUserId = isRequester ? doc.influencerUserId : doc.requesterUserId;
  const notifyRole = isRequester ? "influencer" : doc.requesterRole;

  if (notifyUserId) {
    await Notification.create({
      userId: notifyUserId,
      role: notifyRole,
      title: "Quote request updated",
      body: message,
      type: "general",
      targetId: toId(doc._id),
      metadata: {
        quoteRequestId: toId(doc._id),
        status: nextStatus,
      },
    });
  }

  const profile = await InfluencerProfile.findById(doc.influencerProfileId).lean();
  return {
    message,
    quoteRequest: mapQuoteRequest(doc, profile),
  };
};
