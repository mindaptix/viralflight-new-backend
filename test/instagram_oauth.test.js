import assert from "node:assert/strict";
import test from "node:test";

import {
  buildConnectUrl,
  verifyStateToken,
} from "../src/infrastructure/external/meta/MetaGraphService.js";

const withEnv = (values, callback) => {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]])
  );

  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });

  try {
    return callback();
  } finally {
    Object.entries(previous).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
};

test("Instagram connect URL uses Instagram credentials and exact callback", () => {
  withEnv(
    {
      JWT_SECRET: "test-state-secret",
      INSTAGRAM_APP_ID: "instagram-client-id",
      INSTAGRAM_REDIRECT_URI:
        "https://viralflight.cloud/api/v1/influencer/instagram/callback",
      META_APP_ID: "facebook-client-id",
    },
    () => {
      const connectUrl = new URL(
        buildConnectUrl(
          { userId: "507f1f77bcf86cd799439011", role: "influencer" },
          "instagram"
        )
      );

      assert.equal(connectUrl.origin, "https://www.instagram.com");
      assert.equal(connectUrl.pathname, "/oauth/authorize");
      assert.equal(connectUrl.searchParams.get("client_id"), "instagram-client-id");
      assert.equal(
        connectUrl.searchParams.get("redirect_uri"),
        "https://viralflight.cloud/api/v1/influencer/instagram/callback"
      );
      assert.equal(connectUrl.searchParams.get("response_type"), "code");
      assert.equal(connectUrl.searchParams.get("enable_fb_login"), "0");
      assert.deepEqual(
        connectUrl.searchParams.get("scope").split(",").sort(),
        ["instagram_business_basic", "instagram_business_manage_insights"].sort()
      );

      const state = verifyStateToken(
        connectUrl.searchParams.get("state"),
        "instagram"
      );
      assert.equal(state.userId, "507f1f77bcf86cd799439011");
      assert.equal(state.role, "influencer");
    }
  );
});

test("Facebook connect URL uses Meta credentials, not Instagram credentials", () => {
  withEnv(
    {
      JWT_SECRET: "test-state-secret",
      INSTAGRAM_APP_ID: "instagram-client-id",
      META_APP_ID: "facebook-client-id",
      META_REDIRECT_URI_FACEBOOK:
        "https://viralflight.cloud/api/v1/influencer/facebook/callback",
    },
    () => {
      const connectUrl = new URL(
        buildConnectUrl(
          { userId: "507f1f77bcf86cd799439011", role: "influencer" },
          "facebook"
        )
      );

      assert.equal(connectUrl.searchParams.get("client_id"), "facebook-client-id");
      assert.equal(
        connectUrl.searchParams.get("redirect_uri"),
        "https://viralflight.cloud/api/v1/influencer/facebook/callback"
      );
    }
  );
});
