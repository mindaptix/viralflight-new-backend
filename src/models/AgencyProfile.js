import mongoose from "mongoose";

const AGENCY_TYPES = [
  "Talent Management",
  "Influencer Marketing",
  "Creative / Production",
  "PR & Communications",
  "Full-service Agency",
  "Boutique Agency",
];

const TEAM_SIZES = ["Solo", "2-5", "6-15", "16-50", "50+"];

const CREATORS_MANAGED_RANGES = ["1-10", "11-25", "26-50", "51-100", "100+"];

const FOCUS_AREAS = [
  "Fashion",
  "Beauty",
  "Lifestyle",
  "Food & Beverage",
  "Tech",
  "Finance",
  "Gaming",
  "Travel",
  "Health & Wellness",
  "Entertainment",
  "Automobile",
  "Real Estate",
  "Education",
  "D2C / E-commerce",
];

const agencyProfileSchema = new mongoose.Schema(
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
    agencyName: {
      type: String,
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    agencyType: {
      type: String,
      enum: AGENCY_TYPES,
      trim: true,
    },
    teamSize: {
      type: String,
      enum: TEAM_SIZES,
      trim: true,
    },
    creatorsManaged: {
      type: String,
      enum: CREATORS_MANAGED_RANGES,
      trim: true,
    },
    focusAreas: {
      type: [
        {
          type: String,
          enum: FOCUS_AREAS,
          trim: true,
        },
      ],
      default: [],
    },
    website: {
      type: String,
      trim: true,
    },
    teamSize: {
      type: Number,
      min: 1,
    },
    description: {
      type: String,
      trim: true,
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

export default mongoose.model(
  "AgencyProfile",
  agencyProfileSchema,
  "agency_profiles"
);
