import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["agency", "influencer", "brand"],
      required: true,
    },
    isMobileVerified: {
      type: Boolean,
      default: false,
    },
    lastOtpRequestedAt: {
      type: Date,
    },
    otp: {
      type: String,
      default: null,
    },
    lastLoginAt: {
      type: Date,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
    refreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    refreshTokenIssuedAt: {
      type: Date,
      default: null,
    },
    avatar: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.index({ mobile: 1, role: 1 }, { unique: true });

export default mongoose.model("User", userSchema, "users");
