import mongoose from "mongoose";

const savedCreatorSchema = new mongoose.Schema({
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  ownerRole: { type: String, enum: ["brand", "agency"], required: true, index: true },
  influencerProfileId: { type: mongoose.Schema.Types.ObjectId, ref: "InfluencerProfile", required: true, index: true },
  status: { type: String, enum: ["saved", "shortlisted"], default: "saved", index: true },
  note: { type: String, trim: true, default: "" },
}, { timestamps: true });

savedCreatorSchema.index({ ownerUserId: 1, influencerProfileId: 1 }, { unique: true });

export default mongoose.models.SavedCreator || mongoose.model("SavedCreator", savedCreatorSchema, "saved_creators");
