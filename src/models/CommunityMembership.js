import mongoose from "mongoose";

const communityMembershipSchema = new mongoose.Schema(
  {
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InfluencerProfile",
      index: true,
    },
    isJoined: { type: Boolean, default: false, index: true },
    isFollowing: { type: Boolean, default: false, index: true },
    joinedAt: { type: Date },
    followedAt: { type: Date },
  },
  { timestamps: true }
);

communityMembershipSchema.index(
  { communityId: 1, userId: 1 },
  { unique: true }
);
communityMembershipSchema.index({ userId: 1, isJoined: 1, updatedAt: -1 });

const CommunityMembership =
  mongoose.models.CommunityMembership ||
  mongoose.model(
    "CommunityMembership",
    communityMembershipSchema,
    "community_memberships"
  );

export default CommunityMembership;
