import mongoose from "mongoose";

import {
  BRAND_CAMPAIGN_INTERESTS,
  BRAND_INDUSTRIES,
  BRAND_MONTHLY_CAMPAIGN_BUDGETS,
} from "../constants/profileOptions.js";

const brandProfileSchema = new mongoose.Schema(
  {
    brandName: {
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
    industry: {
      type: String,
      enum: BRAND_INDUSTRIES,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    instagramHandle: {
      type: String,
      trim: true,
    },
    campaignInterests: {
      type: [
        {
          type: String,
          enum: BRAND_CAMPAIGN_INTERESTS,
          trim: true,
        },
      ],
      default: [],
    },
    monthlyCampaignBudget: {
      type: String,
      enum: BRAND_MONTHLY_CAMPAIGN_BUDGETS,
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

export default mongoose.model("BrandProfile", brandProfileSchema, "brand_profiles");
