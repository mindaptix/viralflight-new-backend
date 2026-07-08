import mongoose from "mongoose";

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
      enum: [
        "Fashion & Apparel",
        "Beauty & Personal Care",
        "Food & Beverage",
        "Technology",
        "Finance & Fintech",
        "Health & Fitness",
        "Travel & Hospitality",
        "Automobile",
        "Real Estate",
        "Education",
        "Entertainment",
        "D2C / E-commerce",
        "FMCG",
        "Gaming",
      ],
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
          enum: [
            "Influencer posts",
            "Reels & short video",
            "UGC content",
            "Product seeding",
            "Brand ambassador",
            "Event appearances",
            "Affiliate marketing",
          ],
          trim: true,
        },
      ],
      default: [],
    },
    monthlyCampaignBudget: {
      type: String,
      enum: [
        "Under ₹50K",
        "₹50K - ₹2L",
        "₹2L - ₹10L",
        "₹10L - ₹50L",
        "₹50L+",
        "Not sure yet",
      ],
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
