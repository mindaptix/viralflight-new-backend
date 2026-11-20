import test from "node:test";
import assert from "node:assert/strict";
import {
  buildConnectUrl,
  encryptToken,
  decryptToken,
  getStateData,
} from "../src/infrastructure/external/linkedin/LinkedinOAuthService.js";

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

test("LinkedIn connect URL generates OAuth 2.0 authorization URL with openid profile email scopes", () => {
  withEnv(
    {
      JWT_SECRET: "linkedin-oauth-test-secret",
      LINKEDIN_CLIENT_ID: "linkedin-client-id-123",
      LINKEDIN_CLIENT_SECRET: "linkedin-secret-123",
      LINKEDIN_REDIRECT_URI:
        "https://viralflight.cloud/api/v1/influencer/linkedin/callback",
    },
    () => {
      const user = {
        userId: "507f1f77bcf86cd799439011",
        role: "influencer",
        mobile: "+919999999999",
      };
      const urlStr = buildConnectUrl(user);
      const url = new URL(urlStr);

      assert.equal(url.origin, "https://www.linkedin.com");
      assert.equal(url.pathname, "/oauth/v2/authorization");
      assert.equal(url.searchParams.get("response_type"), "code");
      assert.equal(url.searchParams.get("client_id"), "linkedin-client-id-123");
      assert.equal(
        url.searchParams.get("redirect_uri"),
        "https://viralflight.cloud/api/v1/influencer/linkedin/callback"
      );
      assert.equal(url.searchParams.get("scope"), "openid profile email");

      const state = url.searchParams.get("state");
      assert.ok(state);

      const cached = getStateData(state);
      assert.ok(cached);
      assert.equal(cached.userId, "507f1f77bcf86cd799439011");
    }
  );
});

test("LinkedIn tokens are encrypted at rest", () => {
  withEnv({ JWT_SECRET: "linkedin-token-test-secret" }, () => {
    const token = "linkedin-user-access-token-987";
    const encrypted = encryptToken(token);
    assert.notEqual(encrypted.value, token);
    assert.equal(decryptToken(encrypted), token);
  });
});
