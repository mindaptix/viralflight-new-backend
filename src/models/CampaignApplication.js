import mongoose from "mongoose";

const APPLICATION_STATUSES = [
  "applied",
  "shortlisted",
  "accepted",
  "rejected",
  "withdrawn",
];

const campaignApplicationSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    influencerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    influencerProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InfluencerProfile",
      index: true,
    },
    influencerName: {
      type: String,
      trim: true,
    },
    influencerMobile: {
      type: String,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
    },
    pitch: {
      type: String,
      trim: true,
    },
    proposedRate: {
      type: Number,
      min: 0,
      required: true,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
    },
    portfolioLinks: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      default: "applied",
      index: true,
    },
    ownerMessage: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

campaignApplicationSchema.index(
  { campaignId: 1, influencerUserId: 1 },
  { unique: true }
);

const CampaignApplication =
  mongoose.models.CampaignApplication ||
  mongoose.model(
    "CampaignApplication",
    campaignApplicationSchema,
    "campaign_applications"
  );

export { APPLICATION_STATUSES };
export default CampaignApplication;
