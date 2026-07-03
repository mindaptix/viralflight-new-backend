const mongoose = require("mongoose");
const platformSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    username: {
      type: String,
      trim: true,
    },
    channelName: {
      type: String,
      trim: true,
    },
    followers: {
      type: Number,
      min: 0,
    },
    subscribers: {
      type: Number,
      min: 0,
    },
    engagement: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
  },
  { _id: false }
);

const influencerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    platforms: {
      type: [platformSchema],
      default: [],
    },
    contentCategories: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },
    contentLanguages: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },
    bio: {
      type: String,
      trim: true,
    },
    collaborationPreferences: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },
    rateRange: {
      min: {
        type: Number,
        min: 0,
      },
      max: {
        type: Number,
        min: 0,
      },
      currency: {
        type: String,
        default: "INR",
        trim: true,
        uppercase: true,
      },
    },
    pastCollaborations: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },
    portfolioLinks: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "InfluencerProfile",
  influencerProfileSchema,
  "influencer_profiles"
);
