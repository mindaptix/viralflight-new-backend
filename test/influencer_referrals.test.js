import test from "node:test";
import assert from "node:assert/strict";
import { generateReferralCode } from "../src/application/influencer/ReferralService.js";

test("Referral code generation creates human-friendly code with creator name", async () => {
  const code = await generateReferralCode(
    { displayName: "Deeksha Sharma" },
    { name: "Deeksha Sharma" }
  );

  assert.ok(code.startsWith("DEEKSHA"));
  assert.ok(code.length >= 8);
});

test("Referral code generation fallback with empty name", async () => {
  const code = await generateReferralCode({}, {});
  assert.ok(code.startsWith("CREATOR"));
});
