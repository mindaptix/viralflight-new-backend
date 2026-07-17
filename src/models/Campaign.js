import mongoose from "mongoose";
import { CAMPAIGN_STATUSES } from "../domain/campaigns/CampaignConstants.js";

const campaignSchema = new mongoose.Schema(
  {
    ownerRole: {
      type: String,
      enum: ["brand", "agency"],
      default: "brand",
      index: true,
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    ownerProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    ownerMobile: {
      type: String,
      trim: true,
    },
    ownerName: {
      type: String,
      trim: true,
    },
    brandUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    brandProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BrandProfile",
      index: true,
    },
    brandMobile: {
      type: String,
      trim: true,
    },
    brandName: {
      type: String,
      trim: true,
    },
    agencyUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    agencyProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AgencyProfile",
      index: true,
    },
    agencyMobile: {
      type: String,
      trim: true,
    },
    agencyName: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    platforms: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: [],
    },
    deliverables: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    budgetAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    budgetCurrency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
    },
    coverImageUrl: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    applicationDeadline: {
      type: Date,
      index: true,
    },
    status: {
      type: String,
      enum: CAMPAIGN_STATUSES,
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

campaignSchema.index({ status: 1, applicationDeadline: 1, createdAt: -1 });
campaignSchema.index({ brandUserId: 1, status: 1 });
campaignSchema.index({ agencyUserId: 1, status: 1 });
campaignSchema.index({ ownerRole: 1, ownerUserId: 1, status: 1 });

const Campaign =
  mongoose.models.Campaign ||
  mongoose.model("Campaign", campaignSchema, "campaigns");

export { CAMPAIGN_STATUSES };
export default Campaign;
