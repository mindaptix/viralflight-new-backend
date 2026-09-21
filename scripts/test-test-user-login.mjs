import assert from "assert";
import express from "express";
import http from "http";

import {
  SendOtpUseCase,
  VerifyOtpUseCase,
} from "../src/application/auth/usecases/AuthUseCases.js";
import { TwilioOtpService } from "../src/infrastructure/external/otp/TwilioOtpService.js";
import { env } from "../src/shared/config/env.js";
import { asyncHandler } from "../src/shared/http/asyncHandler.js";
import { sendSuccess } from "../src/shared/http/respond.js";

async function runUnitAndHttpTests() {
  console.log("==================================================================");
  console.log("🚀 Testing Static Influencer Login (9876543211 / OTP: 123456)");
  console.log("==================================================================\n");

  // 1. Test TwilioOtpService directly
  console.log("TEST 1: TwilioOtpService bypass for test mobile");
  const otpService = new TwilioOtpService();
  const sendResult = await otpService.sendOtp("+919876543211");
  assert.strictEqual(sendResult, true, "sendOtp should return true for test mobile");

  const verifyValid = await otpService.verifyOtp("+919876543211", "123456");
  assert.strictEqual(verifyValid, true, "verifyOtp should return true for 123456");

  const verifyInvalid = await otpService.verifyOtp("+919876543211", "999999");
  assert.strictEqual(verifyInvalid, false, "verifyOtp should return false for wrong OTP");
  console.log("✓ TEST 1 Passed: TwilioOtpService correctly handles 9876543211 and OTP 123456");

  // Mock repository in-memory store
  let usersStore = [];
  let profilesStore = [];

  const mockUserRepository = {
    async findByMobileAndRole(mobile, role) {
      return usersStore.find((u) => u.mobile === mobile && u.role === role) || null;
    },
    async findLatestByMobile(mobile, role) {
      return (
        usersStore.find((u) => u.mobile === mobile && (!role || u.role === role)) || null
      );
    },
    async upsertOtpRequest({ mobile, role, isMobileVerified = false, otp = null }) {
      let existing = usersStore.find((u) => u.mobile === mobile && u.role === role);
      if (!existing) {
        existing = {
          _id: "mock_user_id_123",
          mobile,
          role,
          isMobileVerified,
          otp,
          lastOtpRequestedAt: new Date(),
          save: async function () { return this; },
        };
        usersStore.push(existing);
      } else {
        existing.isMobileVerified = isMobileVerified;
        if (otp !== null) existing.otp = otp;
        existing.lastOtpRequestedAt = new Date();
      }
      return existing;
    },
    async save(user) {
      return user;
    },
  };

  const mockProfileRepository = {
    async ensureRoleProfile(user, mobile) {
      let existing = profilesStore.find((p) => p.mobile === mobile);
      if (!existing) {
        existing = {
          userId: user._id || user.userId,
          mobile,
          isProfileComplete: false,
          save: async function () { return this; },
        };
        profilesStore.push(existing);
      }
      return existing;
    },
  };

  const mockAuthService = {
    createSessionTokens(user) {
      return {
        accessToken: "mock_access_token_" + user.role,
        refreshToken: "mock_refresh_token_" + user.role,
      };
    },
    hashToken(token) {
      return "hashed_" + token;
    },
  };

  const sendOtpUseCase = new SendOtpUseCase({
    userRepository: mockUserRepository,
    otpService,
  });

  const verifyOtpUseCase = new VerifyOtpUseCase({
    userRepository: mockUserRepository,
    profileRepository: mockProfileRepository,
    authService: mockAuthService,
    otpService,
  });

  // 2. Test SendOtpUseCase directly with 10 digits
  console.log("\nTEST 2: SendOtpUseCase execution with '9876543211'");
  const sendRes = await sendOtpUseCase.execute({ mobile: "9876543211" });
  assert.strictEqual(sendRes.selectedRole, "influencer");
  assert.strictEqual(sendRes.mobile, "+919876543211");
  assert.strictEqual(usersStore[0].otp, "123456");
  console.log("✓ TEST 2 Passed: SendOtpUseCase normalized mobile and assigned influencer role with OTP 123456");

  // 3. Test Cooldown bypass
  console.log("\nTEST 3: Cooldown bypass check on SendOtpUseCase");
  const sendRes2 = await sendOtpUseCase.execute({ mobile: "9876543211" });
  assert.strictEqual(sendRes2.selectedRole, "influencer");
  console.log("✓ TEST 3 Passed: Immediate re-send permitted for test user");

  // 4. Test VerifyOtpUseCase with wrong OTP
  console.log("\nTEST 4: VerifyOtpUseCase execution with wrong OTP: '000000'");
  let errorCaught = false;
  try {
    await verifyOtpUseCase.execute({ mobile: "9876543211", otp: "000000" });
  } catch (err) {
    errorCaught = true;
    assert.strictEqual(err.message, "Invalid OTP");
  }
  assert.strictEqual(errorCaught, true, "Invalid OTP should throw error");
  console.log("✓ TEST 4 Passed: Wrong OTP correctly rejected with 'Invalid OTP'");

  // 5. Test VerifyOtpUseCase with valid OTP 123456
  console.log("\nTEST 5: VerifyOtpUseCase execution with OTP: '123456'");
  const verifyRes = await verifyOtpUseCase.execute({ mobile: "9876543211", otp: "123456" });
  assert.strictEqual(verifyRes.selectedRole, "influencer");
  assert.strictEqual(verifyRes.dashboard, "influencer");
  assert.strictEqual(verifyRes.isProfileComplete, true);
  assert.strictEqual(verifyRes.redirectTo, "/dashboard/influencer");
  assert.ok(verifyRes.accessToken);
  assert.ok(verifyRes.refreshToken);
  console.log("✓ TEST 5 Passed: VerifyOtpUseCase completed successfully with influencer dashboard redirect");

  // 6. Test Express HTTP endpoints
  console.log("\nTEST 6: HTTP Express integration for /api/auth/send-otp & /api/auth/verify-otp");
  const testApp = express();
  testApp.use(express.json());

  testApp.post("/api/auth/send-otp", asyncHandler(async (req, res) => {
    const result = await sendOtpUseCase.execute(req.body);
    sendSuccess(res, result);
  }));

  testApp.post("/api/auth/verify-otp", asyncHandler(async (req, res) => {
    const result = await verifyOtpUseCase.execute(req.body);
    sendSuccess(res, result);
  }));

  const testServer = http.createServer(testApp);
  await new Promise((resolve) => testServer.listen(0, resolve));
  const port = testServer.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const httpSend = await fetch(`${baseUrl}/api/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: "9876543211" }),
    });
    const httpSendJson = await httpSend.json();
    assert.strictEqual(httpSend.status, 200);
    assert.strictEqual(httpSendJson.success, true);
    assert.strictEqual(httpSendJson.selectedRole, "influencer");

    const httpVerify = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: "9876543211", otp: "123456" }),
    });
    const httpVerifyJson = await httpVerify.json();
    assert.strictEqual(httpVerify.status, 200);
    assert.strictEqual(httpVerifyJson.success, true);
    assert.strictEqual(httpVerifyJson.selectedRole, "influencer");
    assert.strictEqual(httpVerifyJson.dashboard, "influencer");
    assert.strictEqual(httpVerifyJson.redirectTo, "/dashboard/influencer");
    assert.strictEqual(httpVerifyJson.isProfileComplete, true);
    assert.ok(httpVerifyJson.accessToken);
    assert.ok(httpVerifyJson.refreshToken);
    console.log("✓ TEST 6 Passed: Full HTTP endpoints verified successfully");
  } finally {
    testServer.close();
  }

  console.log("\n==================================================");
  console.log("🎉 ALL 6 TEST SUITES PASSED WITH 100% SUCCESS! 🎉");
  console.log("==================================================");
}

runUnitAndHttpTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
