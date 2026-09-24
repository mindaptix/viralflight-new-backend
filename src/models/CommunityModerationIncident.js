import mongoose from "mongoose";

const communityModerationIncidentSchema = new mongoose.Schema(
  {
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", index: true },
    category: { type: String, default: "abusive_language", trim: true },
    matchedTerms: { type: [{ type: String, trim: true }], default: [] },
    action: { type: String, enum: ["blocked", "community_ban"], default: "blocked" },
  },
  { timestamps: true }
);

communityModerationIncidentSchema.index({ communityId: 1, userId: 1, createdAt: -1 });

export default mongoose.models.CommunityModerationIncident ||
  mongoose.model(
    "CommunityModerationIncident",
    communityModerationIncidentSchema,
    "community_moderation_incidents"
  );
