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

test("validateReferralCode returns valid=false when code is empty or not found", async () => {
  const { validateReferralCode } = await import("../src/application/influencer/ReferralService.js");

  const emptyRes = await validateReferralCode("");
  assert.equal(emptyRes.valid, false);

  const invalidRes = await validateReferralCode("VIRAL50");
  assert.equal(invalidRes.valid, false);
  assert.match(invalidRes.message, /invalid referral code/i);

  // Test valid code with mock
  const validRes = await validateReferralCode("DEEKSHA77", async (code) => {
    return code === "DEEKSHA77" ? { name: "Deeksha Sharma", userId: "507f1f77bcf86cd799439001" } : null;
  });
  assert.equal(validRes.valid, true);
  assert.equal(validRes.referralCode, "DEEKSHA77");
  assert.equal(validRes.referrerName, "Deeksha Sharma");
});
