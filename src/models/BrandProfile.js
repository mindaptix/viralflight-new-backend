import mongoose from "mongoose";

import {
  BRAND_CAMPAIGN_INTERESTS,
  BRAND_INDUSTRIES,
  BRAND_MONTHLY_CAMPAIGN_BUDGETS,
} from "../constants/profileOptions.js";

// ─── Brand Kit Sub-Schema ─────────────────────────────────────────────────────
const brandKitSchema = new mongoose.Schema(
  {
    logoUrlDark: { type: String, trim: true },
    logoUrlLight: { type: String, trim: true },
    brandColors: { type: [{ type: String, trim: true }], default: [] },
    primaryFont: { type: String, trim: true, default: "Inter" },
    giftingEnabled: { type: Boolean, default: false },
    sampleProducts: { type: [mongoose.Schema.Types.Mixed], default: [] },
    creativeDos: { type: [{ type: String, trim: true }], default: [] },
    creativeDonts: { type: [{ type: String, trim: true }], default: [] },
    moodboardUrls: { type: [{ type: String, trim: true }], default: [] },
    ndaMonths: { type: Number, default: 24 },
    ndaPerpetual: { type: Boolean, default: false },
    autoNdaEnabled: { type: Boolean, default: true },
  },
  { _id: false }
);

// ─── Escrow Config Sub-Schema ─────────────────────────────────────────────────
const escrowConfigSchema = new mongoose.Schema(
  {
    bankAccountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true, uppercase: true },
    billingGstin: { type: String, trim: true, uppercase: true },
    bankName: { type: String, trim: true },
    bankBranch: { type: String, trim: true },
    bankVerified: { type: Boolean, default: false },
    upiAutoDebitEnabled: { type: Boolean, default: false },
    upiId: { type: String, trim: true },
    mandateLimit: { type: Number, default: 500000, min: 0 },
    milestoneReviewWindowHours: { type: Number, default: 48 },
    dualSignOffThresholdAmount: { type: Number, default: 100000, min: 0 },
    primarySignatoryName: { type: String, trim: true },
    primarySignatoryRole: { type: String, trim: true },
    tdsAutomationEnabled: { type: Boolean, default: true },
    gstEInvoicingEnabled: { type: Boolean, default: true },
    initialDepositAmount: { type: Number, default: 0, min: 0 },
    escrowAuthorized: { type: Boolean, default: false },
    complianceConfirmed: { type: Boolean, default: false },
    configuredAt: { type: Date },
  },
  { _id: false }
);

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
    bio: {
      type: String,
      trim: true,
    },
    profileImageUrl: {
      type: String,
      trim: true,
    },
    contactName: {
      type: String,
      trim: true,
    },
    // ─── Step 1: Identity & Tax ───────────────────────────────────────────
    gstNumber: { type: String, trim: true, uppercase: true },
    gstVerified: { type: Boolean, default: false },
    gstCompanyName: { type: String, trim: true },
    targetNiches: { type: [{ type: String, trim: true }], default: [] },
    scaleTiers: { type: [{ type: String, trim: true }], default: [] },
    budgetRange: { type: String, trim: true },
    primaryCampaignGoals: { type: [{ type: String, trim: true }], default: [] },
    escrowConsent: { type: Boolean, default: false },
    termsAccepted: { type: Boolean, default: false },
    // ─── Step 2: Brand Kit ────────────────────────────────────────────────
    brandKit: { type: brandKitSchema, default: () => ({}) },
    // ─── Step 3: Escrow & Payout Vault ────────────────────────────────────
    escrowConfig: { type: escrowConfigSchema, default: () => ({}) },
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
