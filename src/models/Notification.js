import mongoose from "mongoose";

const NOTIFICATION_TYPES = [
  "general",
  "campaign_invite",
  "application_status",
  "profile_view",
  "community",
  "campaign",
];

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["influencer", "brand", "agency"],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      default: "general",
      index: true,
    },
    targetId: { type: String, trim: true, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema, "notifications");

export { NOTIFICATION_TYPES };
export default Notification;
