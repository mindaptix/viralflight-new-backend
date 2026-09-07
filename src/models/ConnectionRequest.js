import mongoose from "mongoose";

const CONNECTION_REQUEST_KINDS = ["quote", "connection"];
const CONNECTION_REQUEST_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "disconnected",
];

const connectionRequestSchema = new mongoose.Schema(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    creatorProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InfluencerProfile",
      index: true,
    },
    creatorMobile: {
      type: String,
      trim: true,
      index: true,
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    brandRole: {
      type: String,
      enum: ["brand", "agency"],
      required: true,
      index: true,
    },
    brandName: {
      type: String,
      trim: true,
      default: "",
    },
    brandNiche: {
      type: String,
      trim: true,
      default: "",
    },
    kind: {
      type: String,
      enum: CONNECTION_REQUEST_KINDS,
      required: true,
      default: "quote",
      index: true,
    },
    message: {
      type: String,
      trim: true,
      default: "",
    },
    budgetDisplay: {
      type: String,
      trim: true,
      default: null,
    },
    deliverable: {
      type: String,
      trim: true,
      default: null,
    },
    city: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: CONNECTION_REQUEST_STATUSES,
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

connectionRequestSchema.index({ brandId: 1, status: 1, createdAt: -1 });
connectionRequestSchema.index({ creatorId: 1, status: 1, createdAt: -1 });
connectionRequestSchema.index({ creatorProfileId: 1, status: 1, createdAt: -1 });
connectionRequestSchema.index({ kind: 1, status: 1, createdAt: -1 });

const ConnectionRequest =
  mongoose.models.ConnectionRequest ||
  mongoose.model(
    "ConnectionRequest",
    connectionRequestSchema,
    "connections_requests"
  );

export { CONNECTION_REQUEST_KINDS, CONNECTION_REQUEST_STATUSES };
export default ConnectionRequest;
