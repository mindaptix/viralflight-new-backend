import test from "node:test";
import assert from "node:assert/strict";
import {
  maskPan,
  maskAccountNumber,
  validatePanFormat,
  validateGstFormat,
  validateIfscFormat,
  validateVpaFormat,
} from "../src/infrastructure/external/payout/PayoutGatewayService.js";

test("PAN masking and format validation", () => {
  assert.equal(maskPan("ABCDE1234F"), "ABCDE****F");
  assert.equal(validatePanFormat("ABCDE1234F"), true);
  assert.equal(validatePanFormat("abcde1234f"), true);
  assert.equal(validatePanFormat("12345ABCDE"), false);
  assert.equal(validatePanFormat("ABCDE12345"), false);
  assert.equal(validatePanFormat("ABC1234F"), false);
});

test("GST format validation", () => {
  assert.equal(validateGstFormat("07AAAAA0000A1Z5"), true);
  assert.equal(validateGstFormat("27AABCS1429B1ZB"), true);
  assert.equal(validateGstFormat("INVALIDGST"), false);
  assert.equal(validateGstFormat("07AAAAA0000A15"), false);
});

test("Bank account and IFSC / UPI validation", () => {
  assert.equal(maskAccountNumber("123456789012"), "••••••••9012");
  assert.equal(maskAccountNumber("987654321"), "••••••••4321");
  assert.equal(validateIfscFormat("HDFC0001234"), true);
  assert.equal(validateIfscFormat("ICIC0000001"), true);
  assert.equal(validateIfscFormat("HDFC1234567"), false); // 5th char must be 0

  assert.equal(validateVpaFormat("creator@okhdfcbank"), true);
  assert.equal(validateVpaFormat("creator@upi"), true);
  assert.equal(validateVpaFormat("not-a-vpa"), false);
});
