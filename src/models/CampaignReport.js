import mongoose from "mongoose";
const schema = new mongoose.Schema({
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
  reporterUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reason: { type: String, required: true },
}, { timestamps: true });
export default mongoose.models.CampaignReport || mongoose.model("CampaignReport", schema);
