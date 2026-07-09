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
    lastLoginAt: {
      type: Date,
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
  },
  { timestamps: true }
);

userSchema.index({ mobile: 1, role: 1 }, { unique: true });

export default mongoose.model("User", userSchema, "users");
