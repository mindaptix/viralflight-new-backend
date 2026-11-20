import test from "node:test";
import assert from "node:assert/strict";
import {
  buildConnectUrl,
  encryptToken,
  decryptToken,
  getStateData,
  generateCodeVerifier,
  generateCodeChallenge,
} from "../src/infrastructure/external/x/XOAuthService.js";
import oauthCache from "../src/infrastructure/cache/cacheService.js";

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

test("X connect URL generates PKCE authorization URL with tweet.read users.read offline.access scopes and saves verifier in cache", () => {
  withEnv(
    {
      JWT_SECRET: "x-oauth-test-secret",
      X_CLIENT_ID: "x-client-id-123",
      X_REDIRECT_URI: "https://viralflight.cloud/api/v1/influencer/x/callback",
    },
    () => {
      const user = {
        userId: "507f1f77bcf86cd799439011",
        role: "influencer",
        mobile: "+919999999999",
      };
      const urlStr = buildConnectUrl(user);
      const url = new URL(urlStr);

      assert.equal(url.origin, "https://twitter.com");
      assert.equal(url.pathname, "/i/oauth2/authorize");
      assert.equal(url.searchParams.get("response_type"), "code");
      assert.equal(url.searchParams.get("client_id"), "x-client-id-123");
      assert.equal(
        url.searchParams.get("redirect_uri"),
        "https://viralflight.cloud/api/v1/influencer/x/callback"
      );
      assert.equal(
        url.searchParams.get("scope"),
        "tweet.read users.read offline.access"
      );
      assert.equal(url.searchParams.get("code_challenge_method"), "S256");

      const state = url.searchParams.get("state");
      assert.ok(state);

      // Verify cached PKCE state
      const cached = getStateData(state);
      assert.ok(cached);
      assert.equal(cached.userId, "507f1f77bcf86cd799439011");
      assert.ok(cached.codeVerifier);
    }
  );
});

test("PKCE code verifier and challenge generation", () => {
  const verifier = generateCodeVerifier();
  assert.ok(verifier.length >= 43);
  const challenge = generateCodeChallenge(verifier);
  assert.ok(challenge);
  assert.notEqual(challenge, verifier);
});

test("X tokens are encrypted at rest with AES-256-GCM", () => {
  withEnv({ JWT_SECRET: "test-encryption-key-for-x" }, () => {
    const secret = "x-user-oauth-access-token-12345";
    const encrypted = encryptToken(secret);
    assert.notEqual(encrypted.value, secret);
    assert.equal(decryptToken(encrypted), secret);
  });
});
