import mongoose from "mongoose";

const COLLABORATION_STATUSES = [
  "active",
  "completed",
  "cancelled",
  "paused",
  "disputed",
];

const collaborationSchema = new mongoose.Schema(
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
    inviteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BrandInvite",
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
    },
    title: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: COLLABORATION_STATUSES,
      default: "active",
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

collaborationSchema.index({ influencerProfileId: 1, status: 1 });
collaborationSchema.index({ brandUserId: 1, status: 1 });

const Collaboration =
  mongoose.models.Collaboration ||
  mongoose.model("Collaboration", collaborationSchema, "collaborations");

export { COLLABORATION_STATUSES };
export default Collaboration;
