import express from "express";
import mongoose from "mongoose";
import ConnectionRequest from "../../../models/ConnectionRequest.js";
import InfluencerProfile from "../../../models/InfluencerProfile.js";
import BrandProfile from "../../../models/BrandProfile.js";
import AgencyProfile from "../../../models/AgencyProfile.js";
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

router.use(requireRoles(["brand", "agency", "influencer"]));
router.get("/", asyncHandler(async (req, res) => {
  const rows = await ConnectionRequest.find(scope(req.user)).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, data: rows.map(row => ({
    ...row, isIncoming: req.user.role === "influencer", creatorMobile: undefined,
  })) });
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
  res.json({ success: true, data: { id: row._id, status: row.status } });
}));
export default router;
