import mongoose from "mongoose";

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
    city: {
      type: String,
      trim: true,
    },
    services: {
      type: [
        {
          type: String,
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
    clientIndustries: {
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

export default mongoose.model(
  "AgencyProfile",
  agencyProfileSchema,
  "agency_profiles"
);
