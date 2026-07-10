import mongoose from "mongoose";

const CAMPAIGN_STATUSES = [
  "draft",
  "active",
  "paused",
  "completed",
  "cancelled",
];

const campaignSchema = new mongoose.Schema(
  {
    brandUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    brandProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BrandProfile",
      index: true,
    },
    brandMobile: {
      type: String,
      required: true,
      trim: true,
    },
    brandName: {
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

const Campaign =
  mongoose.models.Campaign ||
  mongoose.model("Campaign", campaignSchema, "campaigns");

export { CAMPAIGN_STATUSES };
export default Campaign;
