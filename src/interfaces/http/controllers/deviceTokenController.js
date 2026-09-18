import mongoose from "mongoose";
import UserDevice from "../../../models/UserDevice.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";
import { ValidationError } from "../../../shared/errors/AppError.js";

/**
 * Register or update device FCM token for the authenticated user.
 * POST /api/v1/notifications/device-token
 */
export const registerDeviceToken = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?.id;
  if (!userId) {
    throw new ValidationError("User ID missing from authentication token");
  }

  const rawToken = req.body?.fcmToken || req.body?.fcm_token;
  if (!rawToken || typeof rawToken !== "string" || !rawToken.trim()) {
    throw new ValidationError("fcmToken is required");
  }

  const fcmToken = rawToken.trim();
  const rawPlatform = (req.body?.platform || "android").toLowerCase().trim();
  const platform = ["android", "ios", "web"].includes(rawPlatform)
    ? rawPlatform
    : "android";

  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Upsert device token for this user
  const device = await UserDevice.findOneAndUpdate(
    { fcmToken },
    {
      $set: {
        userId: userObjectId,
        platform,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  sendSuccess(res, {
    statusCode: 200,
    message: "Device token registered successfully",
    data: {
      id: String(device._id),
      userId: String(device.userId),
      platform: device.platform,
      updatedAt: device.updatedAt,
    },
  });
});

/**
 * Unregister device token (e.g. on logout).
 * DELETE /api/v1/notifications/device-token
 */
export const unregisterDeviceToken = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?.id;
  const rawToken = req.body?.fcmToken || req.body?.fcm_token || req.query?.fcmToken || req.query?.fcm_token;

  if (rawToken && typeof rawToken === "string") {
    await UserDevice.deleteMany({ fcmToken: rawToken.trim() });
  } else if (userId) {
    await UserDevice.deleteMany({ userId });
  }

  sendSuccess(res, {
    message: "Device token unregistered successfully",
  });
});
