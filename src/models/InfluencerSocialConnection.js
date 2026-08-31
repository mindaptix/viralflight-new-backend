import mongoose from "mongoose";

const encryptedTokenSchema = new mongoose.Schema(
  {
    iv: { type: String, select: false },
    tag: { type: String, select: false },
    value: { type: String, select: false },
  },
  { _id: false }
);

const influencerSocialConnectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    platform: {
      type: String,
      required: true,
      enum: ["instagram", "facebook"],
      trim: true,
      lowercase: true,
    },
    platformUserId: { type: String, trim: true, index: true },
    handle: { type: String, trim: true },
    accessToken: { type: encryptedTokenSchema, select: false },
    refreshToken: { type: encryptedTokenSchema, select: false },
    tokenExpiresAt: { type: Date },
    followers: { type: Number, min: 0, default: 0 },
    follows: { type: Number, min: 0 },
    mediaCount: { type: Number, min: 0 },
    likes: { type: Number, min: 0 },
    engagementRate: { type: Number, min: 0, max: 100 },
    profilePictureUrl: { type: String, trim: true },
    accountType: { type: String, trim: true, uppercase: true },
    pageName: { type: String, trim: true },
    facebookPageId: { type: String, trim: true },
    isConnected: { type: Boolean, default: false, index: true },
    lastSyncedAt: { type: Date },
    rawMetaPayload: { type: mongoose.Schema.Types.Mixed },
    syncError: {
      message: { type: String, trim: true },
      code: { type: String, trim: true },
      occurredAt: { type: Date },
    },
  },
  { timestamps: true }
);

influencerSocialConnectionSchema.index({ userId: 1, platform: 1 }, { unique: true });

const InfluencerSocialConnection =
  mongoose.models.InfluencerSocialConnection ||
  mongoose.model(
    "InfluencerSocialConnection",
    influencerSocialConnectionSchema,
    "influencer_social_connections"
  );

export default InfluencerSocialConnection;
