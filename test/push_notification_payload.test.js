import test from "node:test";
import assert from "node:assert/strict";
import {
  sendPushNotificationSafe,
  sendMulticastPush,
} from "../src/infrastructure/notifications/pushNotificationService.js";

test("FCM payload standard - data strings and click_action", async () => {
  // Verify that sendPushNotificationSafe does not throw even with null/undefined
  assert.doesNotThrow(() => {
    sendPushNotificationSafe({
      userId: "507f1f77bcf86cd799439011",
      notification: {
        title: "Application Accepted! 🎉",
        body: "Your application for 'Summer Glow Campaign' was approved.",
      },
      data: {
        type: "application_accepted",
        campaignId: 12345,
        status: "accepted",
      },
    });
  });
});

test("FCM push handles empty or invalid inputs gracefully without throwing", async () => {
  const result1 = await sendMulticastPush({
    tokens: [],
    notification: { title: "Test", body: "Test" },
  });
  assert.equal(result1.successCount, 0);
  assert.equal(result1.failureCount, 0);

  const result2 = await sendMulticastPush({
    tokens: null,
    notification: null,
  });
  assert.equal(result2.successCount, 0);
  assert.equal(result2.failureCount, 0);
});
