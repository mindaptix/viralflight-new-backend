import mongoose from "mongoose";

const ALLOWED_CITIES = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
  "Chandigarh",
  "Kochi",
  "Indore",
  "Bhopal",
  "Nagpur",
  "Surat",
  "Goa",
  "Dehradun",
  "Patna",
  "Guwahati",
];

const PRIMARY_PLATFORMS = ["instagram", "youtube", "tiktok"];
const SECONDARY_PLATFORMS = ["twitter", "snapchat", "linkedin", "facebook"];

const PLATFORM_OPTIONS = [
  {
    platform: "instagram",
    label: "Instagram",
    isPrimary: true,
    fields: ["username", "followers", "engagement"],
  },
  {
    platform: "youtube",
    label: "YouTube",
    isPrimary: true,
    fields: ["channelName", "subscribers", "engagement"],
  },
  {
    platform: "tiktok",
    label: "TikTok",
    isPrimary: true,
    fields: ["username", "followers", "engagement"],
  },
  {
    platform: "twitter",
    label: "X (Twitter)",
    isPrimary: false,
    fields: ["username", "followers", "engagement"],
  },
  {
    platform: "facebook",
    label: "Facebook",
    isPrimary: false,
    fields: ["username", "followers", "engagement"],
  },
  {
    platform: "linkedin",
    label: "LinkedIn",
    isPrimary: false,
    fields: ["username", "followers", "engagement"],
  },
  {
    platform: "snapchat",
    label: "Snapchat",
    isPrimary: false,
    fields: ["username", "followers", "engagement"],
  },
];

const ALLOWED_PLATFORMS = PLATFORM_OPTIONS.map((option) => option.platform);

const PLATFORM_REQUIRED_FIELDS = PLATFORM_OPTIONS.reduce((fields, option) => {
  fields[option.platform] = option.fields;
  return fields;
}, {});

const CONTENT_CATEGORIES = [
  "Fashion",
  "Lifestyle",
  "Beauty",
  "Fitness",
  "Food",
  "Travel",
  "Tech",
  "Finance",
  "Gaming",
  "Parenting",
  "Education",
  "Comedy",
  "Music",
  "Dance",
  "Photography",
  "Art & Design",
  "Health & Wellness",
  "Automobile",
  "Real Estate",
  "Sports",
  "Pets",
  "Spirituality",
  "News & Commentary",
  "DIY & Crafts",
];

const CONTENT_LANGUAGES = [
  "Hindi",
  "English",
  "Tamil",
  "Telugu",
  "Bengali",
  "Marathi",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "Urdu",
  "Odia",
];

const COLLABORATION_PREFERENCES = [
  "paid_only",
  "barter_product",
  "paid_and_barter",
];

const COLLABORATION_PREFERENCE_OPTIONS = [
  { value: "paid_only", label: "Paid only" },
  { value: "barter_product", label: "Barter / product" },
  { value: "paid_and_barter", label: "Paid & barter" },
];

const ONBOARDING_VALIDATION = {
  nameMinLength: 2,
  bioMinLength: 30,
  contentCategoriesMin: 5,
  contentCategoriesMax: 5,
  contentLanguagesMin: 1,
  engagementMin: 0,
  engagementMax: 100,
};

const ONBOARDING_STEPS = [
  "basic-info",
  "connect-platform",
  "content-preferences",
  "finish-profile",
  "completed",
];

// ─── Platform sub-schema (Instagram, YouTube, TikTok, etc.) ─────────────────
const platformSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      required: true,
      enum: ALLOWED_PLATFORMS,
      trim: true,
      lowercase: true,
    },
    username: { type: String, trim: true },
    channelName: { type: String, trim: true },
    followers: { type: Number, min: 0 },
    subscribers: { type: Number, min: 0 },
    engagement: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
  },
  { _id: false }
);

const rateRangeSchema = new mongoose.Schema(
  {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
    currency: { type: String, default: "INR", trim: true, uppercase: true },
  },
  { _id: false }
);

const instagramTokenSchema = new mongoose.Schema(
  {
    iv: { type: String, select: false },
    tag: { type: String, select: false },
    value: { type: String, select: false },
    expiresAt: { type: Date },
  },
  { _id: false }
);

const instagramConnectionSchema = new mongoose.Schema(
  {
    handle: { type: String, trim: true, lowercase: true },
    instagramUserId: { type: String, trim: true, index: true },
    facebookPageId: { type: String, trim: true },
    accountType: { type: String, trim: true, uppercase: true },
    followers: { type: Number, min: 0 },
    follows: { type: Number, min: 0 },
    mediaCount: { type: Number, min: 0 },
    engagementRate: { type: Number, min: 0, max: 100 },
    profilePictureUrl: { type: String, trim: true },
    lastSyncedAt: { type: Date },
    connectedAt: { type: Date },
    isConnected: { type: Boolean, default: false },
    token: instagramTokenSchema,
    syncError: {
      message: { type: String, trim: true },
      code: { type: String, trim: true },
      occurredAt: { type: Date },
    },
  },
  { _id: false }
);

const influencerProfileSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    city: { type: String, enum: ALLOWED_CITIES, trim: true },

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
      index: true,
    },

    platforms: { type: [platformSchema], default: [] },
    instagram: { type: instagramConnectionSchema, default: () => ({}) },

    contentCategories: {
      type: [{ type: String, enum: CONTENT_CATEGORIES, trim: true }],
      default: [],
    },
    contentLanguages: {
      type: [{ type: String, enum: CONTENT_LANGUAGES, trim: true }],
      default: [],
    },

    bio: { type: String, trim: true },
    collaborationPreference: {
      type: String,
      enum: COLLABORATION_PREFERENCES,
      trim: true,
    },
    rateRange: rateRangeSchema,
    pastCollaborations: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    portfolioLink: { type: String, trim: true },

    isProfileComplete: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

const getDefaultOnboardingSettings = () => ({
  cities: ALLOWED_CITIES,
  platforms: PLATFORM_OPTIONS,
  primaryPlatforms: PRIMARY_PLATFORMS,
  secondaryPlatforms: SECONDARY_PLATFORMS,
  contentCategories: CONTENT_CATEGORIES,
  contentLanguages: CONTENT_LANGUAGES,
  collaborationPreferences: COLLABORATION_PREFERENCES,
  collaborationPreferenceOptions: COLLABORATION_PREFERENCE_OPTIONS,
  validation: ONBOARDING_VALIDATION,
  steps: ONBOARDING_STEPS,
});

export {
  ALLOWED_CITIES,
  PRIMARY_PLATFORMS,
  SECONDARY_PLATFORMS,
  PLATFORM_OPTIONS,
  ALLOWED_PLATFORMS,
  PLATFORM_REQUIRED_FIELDS,
  CONTENT_CATEGORIES,
  CONTENT_LANGUAGES,
  COLLABORATION_PREFERENCES,
  COLLABORATION_PREFERENCE_OPTIONS,
  ONBOARDING_VALIDATION,
  ONBOARDING_STEPS,
  platformSchema,
  rateRangeSchema,
  influencerProfileSchema,
  getDefaultOnboardingSettings,
};

const InfluencerProfile =
  mongoose.models.InfluencerProfile ||
  mongoose.model(
    "InfluencerProfile",
    influencerProfileSchema,
    "influencer_profiles"
  );

export default InfluencerProfile;
