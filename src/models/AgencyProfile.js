import mongoose from "mongoose";

import {
  AGENCY_CREATORS_MANAGED_RANGES,
  AGENCY_FOCUS_AREAS,
  AGENCY_TEAM_SIZES,
  AGENCY_TYPES,
} from "../constants/profileOptions.js";

const agencyProfileSchema = new mongoose.Schema(
  {
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
    agencyType: {
      type: String,
      enum: AGENCY_TYPES,
      trim: true,
    },
    teamSize: {
      type: String,
      enum: AGENCY_TEAM_SIZES,
      trim: true,
    },
    creatorsManaged: {
      type: String,
      enum: AGENCY_CREATORS_MANAGED_RANGES,
      trim: true,
    },
    focusAreas: {
      type: [
        {
          type: String,
          enum: AGENCY_FOCUS_AREAS,
          trim: true,
        },
      ],
      default: [],
    },
    website: {
      type: String,
      trim: true,
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
