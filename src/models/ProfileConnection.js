import mongoose from "mongoose";

const profileConnectionSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fromRole: {
      type: String,
      enum: ["brand", "agency"],
      required: true,
      index: true,
    },
    fromMobile: { type: String, required: true, trim: true },
    influencerProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InfluencerProfile",
      required: true,
      index: true,
    },
    influencerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    influencerMobile: { type: String, trim: true, index: true },
    note: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["connected", "removed"],
      default: "connected",
      index: true,
    },
    connectedAt: { type: Date, default: Date.now },
    removedAt: { type: Date },
  },
  { timestamps: true }
);

profileConnectionSchema.index(
  { fromUserId: 1, influencerProfileId: 1 },
  { unique: true }
);
profileConnectionSchema.index({ fromUserId: 1, status: 1, connectedAt: -1 });
profileConnectionSchema.index({
  influencerProfileId: 1,
  status: 1,
  connectedAt: -1,
});

const ProfileConnection =
  mongoose.models.ProfileConnection ||
  mongoose.model(
    "ProfileConnection",
    profileConnectionSchema,
    "profile_connections"
  );

export default ProfileConnection;
