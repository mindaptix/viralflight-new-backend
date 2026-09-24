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
      enum: ["instagram", "facebook", "youtube"],
      index: true,
    },
    platformUserId: { type: String, trim: true },
    handle: { type: String, trim: true },
    followers: { type: Number, min: 0, default: 0 },
    follows: { type: Number, min: 0, default: 0 },
    mediaCount: { type: Number, min: 0, default: 0 },
    views: { type: Number, min: 0, default: 0 },
    videoCount: { type: Number, min: 0, default: 0 },
    likes: { type: Number, min: 0, default: 0 },
    engagementRate: { type: Number, min: 0 },
    profilePictureUrl: { type: String, trim: true },
    accountType: { type: String, trim: true },
    pageName: { type: String, trim: true },
    facebookPageId: { type: String, trim: true },
    channelName: { type: String, trim: true },
    youtubeChannelId: { type: String, trim: true },
    isConnected: { type: Boolean, default: false, index: true },
    connectedAt: { type: Date, default: Date.now },
    lastSyncedAt: { type: Date },
    tokenExpiresAt: { type: Date },
    accessToken: { type: encryptedTokenSchema, select: false },
    refreshToken: { type: encryptedTokenSchema, select: false },
    rawMetaPayload: { type: mongoose.Schema.Types.Mixed, select: false },
    syncError: {
      message: { type: String, trim: true },
      code: { type: String, trim: true },
      occurredAt: { type: Date },
    },
  },
  { timestamps: true }
);

influencerSocialConnectionSchema.index(
  { userId: 1, platform: 1 },
  { unique: true }
);

export default mongoose.models.InfluencerSocialConnection ||
  mongoose.model("InfluencerSocialConnection", influencerSocialConnectionSchema);
