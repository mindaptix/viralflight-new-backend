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
    bio: {
      type: String,
      trim: true,
    },
    profileImageUrl: {
      type: String,
      trim: true,
    },
    coverImageUrl: {
      type: String,
      trim: true,
    },
    contactName: {
      type: String,
      trim: true,
    },
    niches: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    // ─── Extended Onboarding Fields ─────────────────────────────────────────────
    gstNumber: { type: String, trim: true, uppercase: true },
    gstVerified: { type: Boolean, default: false },
    representedNiches: { type: [{ type: String, trim: true }], default: [] },
    rosterSize: { type: String, trim: true }, // e.g. "11-50"
    multiTalentDiscount: { type: Boolean, default: false },
    includeGst: { type: Boolean, default: false },
    termsAuthorized: { type: Boolean, default: false },
    // ─── Talent Roster ────────────────────────────────────────────────────────────
    talent: {
      type: [
        {
          influencerProfileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "InfluencerProfile",
          },
          influencerUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          name: { type: String, trim: true },
          instagramHandle: { type: String, trim: true },
          city: { type: String, trim: true },
          niche: { type: String, trim: true },
          status: {
            type: String,
            enum: ["active", "inactive", "pending"],
            default: "active",
          },
          addedAt: { type: Date, default: Date.now },
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
