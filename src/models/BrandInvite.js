import mongoose from "mongoose";

const BRAND_INVITE_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "cancelled",
  "expired",
];

const brandInviteSchema = new mongoose.Schema(
  {
    influencerProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InfluencerProfile",
      required: true,
      index: true,
    },
    influencerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    influencerMobile: {
      type: String,
      trim: true,
      index: true,
    },
    brandUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    brandMobile: {
      type: String,
      required: true,
      trim: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
    },
    message: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: BRAND_INVITE_STATUSES,
      default: "pending",
      index: true,
    },
    respondedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

brandInviteSchema.index({ influencerProfileId: 1, status: 1 });
brandInviteSchema.index({ brandUserId: 1, status: 1 });

const BrandInvite =
  mongoose.models.BrandInvite ||
  mongoose.model("BrandInvite", brandInviteSchema, "brand_invites");

export { BRAND_INVITE_STATUSES };
export default BrandInvite;
