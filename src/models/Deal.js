import mongoose from "mongoose";

const milestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", trim: true, uppercase: true },
    currencySymbol: { type: String, default: "₹", trim: true },
    status: {
      type: String,
      enum: [
        "pending",
        "in_progress",
        "draft_submitted",
        "under_review",
        "approved",
        "released",
      ],
      default: "pending",
    },
    dueDate: { type: Date },
    deadlineText: { type: String, trim: true },
    draftUrl: { type: String, trim: true },
    draftNotes: { type: String, trim: true },
    submittedAt: { type: Date },
    approvedAt: { type: Date },
    releasedAt: { type: Date },
  },
  { timestamps: true }
);

const dealSchema = new mongoose.Schema(
  {
    influencerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    influencerProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InfluencerProfile",
      index: true,
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
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      index: true,
    },
    brandName: { type: String, required: true, trim: true },
    brandLogoUrl: { type: String, trim: true },
    brandVerified: { type: Boolean, default: true },
    brandPartnerTag: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },

    // Status: incoming (pitch/pending escrow), counter_offered, active (escrow locked/in progress), completed, cancelled
    status: {
      type: String,
      enum: [
        "incoming",
        "counter_offered",
        "active",
        "completed",
        "cancelled",
        "rejected",
      ],
      default: "incoming",
      index: true,
    },
    dealType: {
      type: String,
      enum: ["escrow_secured", "direct_pitch", "campaign_collab"],
      default: "escrow_secured",
    },

    // Financial & Escrow metrics
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", trim: true, uppercase: true },
    currencySymbol: { type: String, default: "₹", trim: true },
    escrowLockedAmount: { type: Number, default: 0, min: 0 },
    escrowStatus: {
      type: String,
      enum: [
        "100% Escrow Funded",
        "Escrow Locked",
        "Pending Deposit",
        "Released",
        "Refunded",
      ],
      default: "100% Escrow Funded",
    },
    securityStatus: {
      type: String,
      default: "100% RBI Escrow Secured",
    },

    // Deliverables & Scope
    deliverables: { type: [{ type: String, trim: true }], default: [] },
    scope: { type: String, trim: true },

    // Expiry & priority
    expiresAt: { type: Date },
    expiryText: { type: String, trim: true },
    actionRequired: { type: Boolean, default: true },

    // Active progress
    completionPercentage: { type: Number, min: 0, max: 100, default: 0 },
    milestones: { type: [milestoneSchema], default: [] },

    // Counter offer details
    counterOffer: {
      counterAmount: { type: Number, min: 0 },
      termsNote: { type: String, trim: true },
      proposedAt: { type: Date },
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending",
      },
    },

    // Completion proof
    completionCertificateUrl: { type: String, trim: true },
    payoutReleasedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

dealSchema.index({ influencerUserId: 1, status: 1, createdAt: -1 });
dealSchema.index({ brandUserId: 1, status: 1 });

const Deal = mongoose.models.Deal || mongoose.model("Deal", dealSchema, "deals");

export { milestoneSchema };
export default Deal;
