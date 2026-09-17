import express from "express";
import mongoose from "mongoose";
import ConnectionRequest from "../../../models/ConnectionRequest.js";
import InfluencerProfile from "../../../models/InfluencerProfile.js";
import BrandProfile from "../../../models/BrandProfile.js";
import AgencyProfile from "../../../models/AgencyProfile.js";
import User from "../../../models/User.js";
import Conversation from "../../../models/Conversation.js";
import { initiateCampaignChat } from "../../../application/chat/ChatService.js";
import { getChatIO } from "../../../infrastructure/socket/chatSocket.js";
import { requireRoles } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { ValidationError, NotFoundError, ConflictError } from "../../../shared/errors/AppError.js";

const router = express.Router();
const id = value => {
  if (!mongoose.isObjectIdOrHexString(value)) throw new ValidationError("Valid id required");
  return value;
};
const scope = user => user.role === "influencer"
  ? { creatorId: user.userId }
  : { brandId: user.userId, brandRole: user.role };

const toId = value => value ? String(value) : "";

const findConversationId = async row => {
  if (row.conversationId) return toId(row.conversationId);
  if (!row.brandId || !row.creatorId || row.status !== "accepted") return "";
  const conversation = await Conversation.findOne({
    participants: { $all: [row.brandId, row.creatorId], $size: 2 },
  }).select("_id").lean();
  return conversation ? toId(conversation._id) : "";
};

const mapConnectionRow = async (row, user) => {
  const conversationId = await findConversationId(row);
  const ownerModel = row.brandRole === "agency" ? AgencyProfile : BrandProfile;
  const owner = row.brandId
    ? await ownerModel.findOne({ userId: row.brandId }).select("profileImageUrl").lean()
    : null;
  const ownerUser = row.brandId
    ? await User.findById(row.brandId).select("avatar").lean()
    : null;
  const brandImageUrl = owner?.profileImageUrl || ownerUser?.avatar || "";
  return {
    ...row,
    id: toId(row._id),
    brandId: toId(row.brandId),
    brand_id: toId(row.brandId),
    creatorId: toId(row.creatorId),
    creator_id: toId(row.creatorId || row.creatorProfileId),
    influencerProfileId: toId(row.creatorProfileId),
    influencer_profile_id: toId(row.creatorProfileId),
    conversationId,
    conversation_id: conversationId,
    brandImageUrl,
    brand_image_url: brandImageUrl,
    isIncoming: user.role === "influencer",
    is_incoming: user.role === "influencer",
    creatorMobile: undefined,
  };
};

router.use(requireRoles(["brand", "agency", "influencer"]));
router.get("/", asyncHandler(async (req, res) => {
  const rows = await ConnectionRequest.find(scope(req.user)).sort({ createdAt: -1 }).limit(100).lean();
  const data = await Promise.all(rows.map(row => mapConnectionRow(row, req.user)));
  res.json({ success: true, data });
}));
router.post("/", requireRoles(["brand", "agency"]), asyncHandler(async (req, res) => {
  const body = req.body || {};
  const profile = await InfluencerProfile.findOne({
    _id: id(body.influencerProfileId), userId: { $ne: null }, claimStatus: { $ne: "unclaimed" },
  });
  if (!profile) throw new NotFoundError("Available creator not found");
  if (!["connection", "quote"].includes(body.kind)) throw new ValidationError("Invalid request kind");
  const existing = await ConnectionRequest.exists({
    creatorId: profile.userId, brandId: req.user.userId, kind: body.kind, status: { $in: ["pending", "accepted"] },
  });
  if (existing) throw new ConflictError("A request already exists");
  const owner = await (req.user.role === "brand" ? BrandProfile : AgencyProfile).findOne({ userId: req.user.userId });
  const row = await ConnectionRequest.create({
    creatorId: profile.userId, creatorProfileId: profile._id,
    brandId: req.user.userId, brandRole: req.user.role,
    brandName: owner?.brandName || owner?.agencyName || req.user.role,
    kind: body.kind, message: String(body.message || "").slice(0, 2000),
    budgetDisplay: String(body.budgetDisplay || "").slice(0, 100),
    deliverable: String(body.deliverable || "").slice(0, 500), status: "pending",
  });
  res.status(201).json({ success: true, data: row });
}));
router.patch("/:id/status", asyncHandler(async (req, res) => {
  const status = req.body?.status;
  const creator = req.user.role === "influencer";
  if (!(creator ? ["accepted", "declined", "disconnected"] : ["disconnected"]).includes(status)) {
    throw new ValidationError("Only the creator can approve or decline contact access");
  }
  const row = await ConnectionRequest.findOneAndUpdate({
    _id: id(req.params.id), ...scope(req.user),
    status: status === "disconnected" ? "accepted" : "pending",
  }, { $set: {
    status, contactConsent: creator && status === "accepted", consentActorId: req.user.userId, consentUpdatedAt: new Date(),
  } }, { new: true, runValidators: true });
  if (!row) throw new ConflictError("Request unavailable or already changed");

  let conversationId = toId(row.conversationId);
  if (creator && status === "accepted" && row.brandId && row.creatorId) {
    const welcomeText =
      row.kind === "quote"
        ? "🎉 Quote request accepted! You can now discuss the collaboration details directly here."
        : "🎉 Connection request accepted! You are now connected and can chat directly here.";
    const chatResult = await initiateCampaignChat({
      brandUserId: row.brandId,
      influencerUserId: row.creatorId,
      initialMessageText: welcomeText,
    });
    conversationId = toId(chatResult.conversation?._id);
    if (conversationId && toId(row.conversationId) !== conversationId) {
      row.conversationId = chatResult.conversation._id;
      await row.save();
    }

    const io = getChatIO();
    if (io && chatResult.message) {
      io.to(`user:${toId(row.brandId)}`).emit("new_message", {
        conversationId,
        message: chatResult.message,
      });
      io.to(`user:${toId(row.creatorId)}`).emit("new_message", {
        conversationId,
        message: chatResult.message,
      });
      io.to(`conversation:${conversationId}`).emit("new_message", {
        conversationId,
        message: chatResult.message,
      });
    }
  }

  res.json({ success: true, data: { id: row._id, status: row.status, conversationId, conversation_id: conversationId } });
}));
export default router;
