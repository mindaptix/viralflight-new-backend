import mongoose from "mongoose";

const influencerProfileViewSchema = new mongoose.Schema(
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
    viewerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    viewerMobile: {
      type: String,
      required: true,
      trim: true,
    },
    viewerRole: {
      type: String,
      enum: ["agency", "brand", "influencer"],
      required: true,
    },
    lastViewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

influencerProfileViewSchema.index(
  { influencerProfileId: 1, viewerUserId: 1 },
  { unique: true }
);

const InfluencerProfileView =
  mongoose.models.InfluencerProfileView ||
  mongoose.model(
    "InfluencerProfileView",
    influencerProfileViewSchema,
    "influencer_profile_views"
  );

export default InfluencerProfileView;
