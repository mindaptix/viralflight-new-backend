import mongoose from "mongoose";

const creatorFollowSchema = new mongoose.Schema(
  {
    followerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    followerProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InfluencerProfile",
      index: true,
    },
    followedProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InfluencerProfile",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

creatorFollowSchema.index(
  { followerUserId: 1, followedProfileId: 1 },
  { unique: true }
);
creatorFollowSchema.index({ followerUserId: 1, createdAt: -1 });

const CreatorFollow =
  mongoose.models.CreatorFollow ||
  mongoose.model("CreatorFollow", creatorFollowSchema, "creator_follows");

export default CreatorFollow;
