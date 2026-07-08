import mongoose from "mongoose";

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
      enum: [
        "Talent Management",
        "Influencer Marketing",
        "Creative / Production",
        "PR & Communications",
        "Full-service Agency",
        "Boutique Agency",
      ],
      trim: true,
    },
    teamSize: {
      type: String,
      enum: ["Solo", "2-5", "6-15", "16-50", "50+"],
      trim: true,
    },
    creatorsManaged: {
      type: String,
      enum: ["1-10", "11-25", "26-50", "51-100", "100+"],
      trim: true,
    },
    focusAreas: {
      type: [
        {
          type: String,
          enum: [
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
          ],
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
