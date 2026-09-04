import mongoose from "mongoose";

const QUOTE_REQUEST_STATUSES = [
  "pending",
  "quoted",
  "accepted",
  "declined",
  "withdrawn",
  "expired",
];

const quoteRequestSchema = new mongoose.Schema(
  {
    requesterUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    requesterRole: {
      type: String,
      enum: ["brand", "agency"],
      required: true,
      index: true,
    },
    requesterMobile: { type: String, required: true, trim: true },
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
    influencerMobile: { type: String, trim: true, index: true },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
    },
    message: { type: String, trim: true, default: "" },
    deliverables: { type: [{ type: String, trim: true }], default: [] },
    budgetHint: { type: Number, min: 0 },
    currency: {
      type: String,
      default: "INR",
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: QUOTE_REQUEST_STATUSES,
      default: "pending",
      index: true,
    },
    quotedAmount: { type: Number, min: 0 },
    quotedCurrency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
    },
    quotedNote: { type: String, trim: true, default: "" },
    quotedAt: { type: Date },
    validityDays: { type: Number, min: 1 },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

quoteRequestSchema.index({ requesterUserId: 1, status: 1, createdAt: -1 });
quoteRequestSchema.index({ influencerProfileId: 1, status: 1, createdAt: -1 });
quoteRequestSchema.index({ influencerUserId: 1, status: 1, createdAt: -1 });

const QuoteRequest =
  mongoose.models.QuoteRequest ||
  mongoose.model("QuoteRequest", quoteRequestSchema, "quote_requests");

export { QUOTE_REQUEST_STATUSES };
export default QuoteRequest;
