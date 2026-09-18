import mongoose from "mongoose";

const userDeviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fcmToken: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ["android", "ios", "web", "unknown"],
      default: "android",
      lowercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

userDeviceSchema.index({ userId: 1, updatedAt: -1 });

const UserDevice =
  mongoose.models.UserDevice ||
  mongoose.model("UserDevice", userDeviceSchema, "user_devices");

export default UserDevice;
