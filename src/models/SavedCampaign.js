import mongoose from "mongoose";

const savedCampaignSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

savedCampaignSchema.index({ userId: 1, campaignId: 1 }, { unique: true });
savedCampaignSchema.index({ userId: 1, createdAt: -1 });

const SavedCampaign =
  mongoose.models.SavedCampaign ||
  mongoose.model("SavedCampaign", savedCampaignSchema, "saved_campaigns");

export default SavedCampaign;
