import mongoose from "mongoose";
import { getMessaging, isFirebaseReady } from "../firebase/firebaseAdmin.js";
import UserDevice from "../../models/UserDevice.js";

const UNREGISTERED_TOKEN_ERROR_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-argument",
  "messaging/invalid-registration-token",
]);

/**
 * Format data object ensuring all values are strings as required by FCM & Flutter.
 */
function sanitizeDataPayload(raw = {}) {
  const result = {};
  for (const [key, value] of Object.entries(raw || {})) {
    if (value !== undefined && value !== null) {
      result[key] = String(value);
    }
  }
  if (!result.click_action) {
    result.click_action = "FLUTTER_NOTIFICATION_CLICK";
  }
  return result;
}

/**
 * Send push notification to a list of tokens.
 * Handles automatic token cleanup for invalid/unregistered tokens.
 */
export async function sendMulticastPush({ tokens, notification, data = {} }) {
  if (!tokens || !tokens.length) return { successCount: 0, failureCount: 0 };
  if (!isFirebaseReady()) {
    console.warn("[PushNotificationService] Firebase is not initialized, skipping push notification.");
    return { successCount: 0, failureCount: 0 };
  }

  const messaging = getMessaging();
  if (!messaging) return { successCount: 0, failureCount: 0 };

  const uniqueTokens = [...new Set(tokens.filter(Boolean))];
  if (!uniqueTokens.length) return { successCount: 0, failureCount: 0 };

  const sanitizedData = sanitizeDataPayload(data);

  const message = {
    tokens: uniqueTokens,
    notification: {
      title: String(notification?.title || "Viral Flight"),
      body: String(notification?.body || ""),
    },
    data: sanitizedData,
    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: "high_importance_channel",
        clickAction: "FLUTTER_NOTIFICATION_CLICK",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
          contentAvailable: true,
        },
      },
    },
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    const tokensToRemove = [];

    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        const errorCode = resp.error.code;
        if (UNREGISTERED_TOKEN_ERROR_CODES.has(errorCode)) {
          tokensToRemove.push(uniqueTokens[idx]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      console.log(`[PushNotificationService] Removing ${tokensToRemove.length} stale FCM token(s)...`);
      try {
        await UserDevice.deleteMany({ fcmToken: { $in: tokensToRemove } });
      } catch (delErr) {
        console.error("[PushNotificationService] Error pruning invalid tokens:", delErr.message);
      }
    }

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (err) {
    console.error("[PushNotificationService] Error executing multicast send:", err.message);
    return { successCount: 0, failureCount: uniqueTokens.length, error: err.message };
  }
}

/**
 * Send push notification to all devices registered to a specific user.
 */
export async function sendPushToUser({ userId, notification, data = {} }) {
  if (!userId) return { successCount: 0, failureCount: 0 };
  if (mongoose.connection?.readyState !== 1) {
    return { successCount: 0, failureCount: 0 };
  }

  try {
    const devices = await UserDevice.find({ userId }).select("fcmToken").lean();
    if (!devices || !devices.length) {
      return { successCount: 0, failureCount: 0 };
    }

    const tokens = devices.map((d) => d.fcmToken).filter(Boolean);
    return await sendMulticastPush({ tokens, notification, data });
  } catch (err) {
    console.error(`[PushNotificationService] Failed to send push to user ${userId}:`, err.message);
    return { successCount: 0, failureCount: 0 };
  }
}

/**
 * Send push notification to multiple users.
 */
export async function sendPushToUsers({ userIds, notification, data = {} }) {
  if (!userIds || !userIds.length) return { successCount: 0, failureCount: 0 };
  if (mongoose.connection?.readyState !== 1) {
    return { successCount: 0, failureCount: 0 };
  }

  try {
    const validUserIds = userIds.filter(Boolean);
    const devices = await UserDevice.find({
      userId: { $in: validUserIds },
    }).select("fcmToken").lean();

    if (!devices || !devices.length) {
      return { successCount: 0, failureCount: 0 };
    }

    const tokens = devices.map((d) => d.fcmToken).filter(Boolean);
    return await sendMulticastPush({ tokens, notification, data });
  } catch (err) {
    console.error("[PushNotificationService] Failed to send push to users:", err.message);
    return { successCount: 0, failureCount: 0 };
  }
}

/**
 * NON-BLOCKING, FIRE-AND-FORGET push notification dispatcher.
 * Guaranteed never to throw, never to block the current request loop,
 * and never to disrupt parent transactions or response flows.
 */
export function sendPushNotificationSafe({ userId, userIds, notification, data = {} }) {
  setImmediate(async () => {
    try {
      if (Array.isArray(userIds) && userIds.length > 0) {
        await sendPushToUsers({ userIds, notification, data });
      } else if (userId) {
        await sendPushToUser({ userId, notification, data });
      }
    } catch (unexpectedError) {
      console.error("[PushNotificationService SafeDispatch Error]:", unexpectedError?.message || unexpectedError);
    }
  });
}

export default {
  sendMulticastPush,
  sendPushToUser,
  sendPushToUsers,
  sendPushNotificationSafe,
};
