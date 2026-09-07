import assert from "assert";
import crypto from "crypto";
import jwt from "jsonwebtoken";

// Set test environment variables
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_32_characters_long_1234";
process.env.META_APP_ID = process.env.META_APP_ID || "123456789012345";
process.env.META_APP_SECRET = process.env.META_APP_SECRET || "mock_meta_app_secret_abc123";
process.env.META_TOKEN_ENCRYPTION_KEY = process.env.META_TOKEN_ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");
process.env.META_REDIRECT_URI_INSTAGRAM = "https://viralflight.cloud/api/influencer/instagram/callback";

import {
  buildConnectUrl,
  buildStateToken,
  verifyStateToken,
  encryptToken,
  decryptToken,
  normalizeHandle,
} from "../src/infrastructure/external/meta/MetaGraphService.js";
import {
  buildInstagramResponse,
} from "../src/application/social/SocialConnectionService.js";

async function runTests() {
  console.log("🚀 Starting Instagram Flow Backend Tests...\n");

  // 1. Test OAuth State generation and verification
  console.log("1. Testing OAuth state generation & verification...");
  const user = { userId: "user_influencer_001", mobile: "9876543210", role: "influencer" };
  const state = buildStateToken(user, "instagram");
  assert(typeof state === "string" && state.length > 20, "State must be a non-empty JWT");

  const verified = verifyStateToken(state, "instagram");
  assert.strictEqual(verified.userId, "user_influencer_001");
  assert.strictEqual(verified.role, "influencer");
  assert.strictEqual(verified.platform, "instagram");
  console.log("   ✅ OAuth state successfully signed and verified.");

  // 2. Test Connect URL builder
  console.log("2. Testing Instagram Connect URL builder...");
  const connectUrl = buildConnectUrl(user, "instagram");
  const urlObj = new URL(connectUrl);
  assert.strictEqual(urlObj.origin, "https://www.instagram.com");
  assert.strictEqual(urlObj.pathname, "/oauth/authorize");
  assert.strictEqual(urlObj.searchParams.get("client_id"), "123456789012345");
  assert.strictEqual(urlObj.searchParams.get("redirect_uri"), "https://viralflight.cloud/api/influencer/instagram/callback");
  assert.strictEqual(urlObj.searchParams.get("response_type"), "code");
  assert(urlObj.searchParams.get("scope").includes("instagram_business_basic"), "Scope must include instagram_business_basic");
  console.log("   ✅ Connect URL contains all required Meta OAuth parameters.");

  // 3. Test AES-256-GCM Token Encryption & Decryption
  console.log("3. Testing AES-256-GCM Token Encryption & Decryption...");
  const mockAccessToken = "IGQWRPVG93aXZA3T1ZAUb2h4aW9ZAXzFmS05ZAaWp...TEST_TOKEN";
  const encrypted = encryptToken(mockAccessToken);
  assert(encrypted.iv && encrypted.tag && encrypted.value, "Encrypted payload must contain iv, tag, and value");
  assert.notStrictEqual(encrypted.value, mockAccessToken, "Encrypted value must not match plaintext");

  const decrypted = decryptToken(encrypted);
  assert.strictEqual(decrypted, mockAccessToken, "Decrypted token must match original plaintext");
  console.log("   ✅ Tokens are securely encrypted with AES-256-GCM.");

  // 4. Test Follower Count Formatting & Response DTO
  console.log("4. Testing Follower count formatting & Instagram response DTO...");
  const mockConnection = {
    isConnected: true,
    handle: "viralcreator",
    platformUserId: "17841400123456789",
    followers: 125400,
    follows: 340,
    mediaCount: 180,
    accountType: "CREATOR",
    profilePictureUrl: "https://instagram.com/pic.jpg",
    lastSyncedAt: new Date(),
  };

  const response = buildInstagramResponse(mockConnection);
  assert.strictEqual(response.isConnected, true);
  assert.strictEqual(response.handle, "viralcreator");
  assert.strictEqual(response.followers, 125400);
  assert.strictEqual(response.followersDisplay, "125.4K");
  assert.strictEqual(response.instagramUserId, "17841400123456789");
  assert.strictEqual(response.accountType, "CREATOR");
  assert.strictEqual(response.accessToken, undefined, "Access token must never be leaked in response DTO");
  console.log("   ✅ Instagram follower count DTO is structured and secure.");

  // 5. Test Disconnected Response DTO
  console.log("5. Testing Disconnected response DTO...");
  const disconnectedResponse = buildInstagramResponse({ isConnected: false });
  assert.strictEqual(disconnectedResponse.isConnected, false);
  assert.strictEqual(disconnectedResponse.handle, "");
  assert.strictEqual(disconnectedResponse.followers, 0);
  assert.strictEqual(disconnectedResponse.followersDisplay, "0");
  console.log("   ✅ Disconnected state properly initialized.");

  console.log("\n🎉 All 5 backend test suites passed successfully!\n");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
