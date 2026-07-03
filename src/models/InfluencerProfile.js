const mongoose = require("mongoose");
const {
  ALLOWED_CITIES,
  ALLOWED_PLATFORMS,
  CONTENT_CATEGORIES,
  CONTENT_LANGUAGES,
  COLLABORATION_PREFERENCES,
} = require("../constants/onboardingConstants");

const platformSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ALLOWED_PLATFORMS,
      required: true,
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
      enum: ALLOWED_CITIES,
    },
    platforms: {
      type: [platformSchema],
      default: [],
    },
    contentCategories: {
      type: [
        {
          type: String,
          enum: CONTENT_CATEGORIES,
        },
      ],
      default: [],
    },
    contentLanguages: {
      type: [
        {
          type: String,
          enum: CONTENT_LANGUAGES,
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
          enum: COLLABORATION_PREFERENCES,
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
