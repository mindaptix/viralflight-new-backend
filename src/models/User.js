const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      unique: true,
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema, "users");
