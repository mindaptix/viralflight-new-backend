import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConnectUrl,
  decryptToken,
  encryptToken,
  verifyStateToken,
} from "../src/infrastructure/external/youtube/YoutubeOAuthService.js";

const withEnv = (values, callback) => {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]])
  );
  Object.assign(process.env, values);
  try {
    return callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

test("YouTube connect URL uses the configured callback and secure state", () => {
  withEnv(
    {
      JWT_SECRET: "youtube-oauth-test-secret",
      YOUTUBE_CLIENT_ID: "client.apps.googleusercontent.com",
      YOUTUBE_REDIRECT_URI:
        "https://viralflight.cloud/api/v1/influencer/youtube/callback",
    },
    () => {
      const url = new URL(
        buildConnectUrl({
          userId: "507f1f77bcf86cd799439011",
          role: "influencer",
          mobile: "+919999999999",
        })
      );
      assert.equal(url.origin, "https://accounts.google.com");
      assert.equal(
        url.searchParams.get("redirect_uri"),
        "https://viralflight.cloud/api/v1/influencer/youtube/callback"
      );
      assert.equal(url.searchParams.get("access_type"), "offline");
      const state = verifyStateToken(url.searchParams.get("state"));
      assert.equal(state.role, "influencer");
      assert.equal(state.platform, "youtube");
    }
  );
});

test("YouTube tokens are encrypted at rest", () => {
  withEnv({ JWT_SECRET: "youtube-token-test-secret" }, () => {
    const encrypted = encryptToken("sensitive-google-token");
    assert.notEqual(encrypted.value, "sensitive-google-token");
    assert.equal(decryptToken(encrypted), "sensitive-google-token");
  });
});
