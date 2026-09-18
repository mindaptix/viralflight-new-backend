import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import UserDevice from "../src/models/UserDevice.js";
import { sendMulticastPush } from "../src/infrastructure/notifications/pushNotificationService.js";

test("Device token API authentication and validation", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "device-token-test-secret";

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    for (const prefix of ["/api/v1", "/api"]) {
      // 1. Unauthenticated request must return 401
      const unauthRes = await fetch(`${base}${prefix}/notifications/device-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fcmToken: "sample-token", platform: "android" }),
      });
      assert.equal(unauthRes.status, 401);

      // 2. Authenticated but missing fcmToken must return 400
      const token = jwt.sign(
        { role: "influencer", userId: "507f1f77bcf86cd799439011" },
        process.env.JWT_SECRET
      );
      const invalidRes = await fetch(`${base}${prefix}/notifications/device-token`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ platform: "android" }),
      });
      assert.equal(invalidRes.status, 400);
      const invalidJson = await invalidRes.json();
      assert.equal(invalidJson.success, false);

      // 3. DELETE endpoint authentication check
      const unauthDel = await fetch(`${base}${prefix}/notifications/device-token`, {
        method: "DELETE",
      });
      assert.equal(unauthDel.status, 401);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test("UserDevice schema validation", () => {
  const device = new UserDevice({
    userId: "507f1f77bcf86cd799439011",
    fcmToken: "test_fcm_token_12345",
    platform: "ios",
  });

  assert.equal(String(device.userId), "507f1f77bcf86cd799439011");
  assert.equal(device.fcmToken, "test_fcm_token_12345");
  assert.equal(device.platform, "ios");

  // Default platform is android
  const defaultDevice = new UserDevice({
    userId: "507f1f77bcf86cd799439011",
    fcmToken: "test_fcm_token_67890",
  });
  assert.equal(defaultDevice.platform, "android");
});

test("Automatic cleanup of unregistered tokens on Firebase error", async () => {
  let deletedTokens = [];
  const originalDeleteMany = UserDevice.deleteMany;
  UserDevice.deleteMany = async (filter) => {
    if (filter?.fcmToken?.$in) {
      deletedTokens.push(...filter.fcmToken.$in);
    }
    return { deletedCount: deletedTokens.length };
  };

  try {
    const { getMessaging } = await import("../src/infrastructure/firebase/firebaseAdmin.js");
    const messaging = getMessaging();
    const originalSend = messaging.sendEachForMulticast;

    // Simulate Firebase multicast response with an invalid token error
    messaging.sendEachForMulticast = async (msg) => {
      return {
        successCount: 0,
        failureCount: 1,
        responses: [
          {
            success: false,
            error: {
              code: "messaging/registration-token-not-registered",
              message: "Requested entity was not found.",
            },
          },
        ],
      };
    };

    const result = await sendMulticastPush({
      tokens: ["stale_token_abc_123"],
      notification: { title: "Test", body: "Test" },
      data: { type: "test" },
    });

    assert.equal(result.failureCount, 1);
    assert.deepEqual(deletedTokens, ["stale_token_abc_123"]);

    // Restore original mock
    messaging.sendEachForMulticast = originalSend;
  } finally {
    UserDevice.deleteMany = originalDeleteMany;
  }
});
