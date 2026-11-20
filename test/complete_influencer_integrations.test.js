import test from "node:test";
import assert from "node:assert/strict";

import InfluencerProfile from "../src/models/InfluencerProfile.js";
import User from "../src/models/User.js";
import ReferralLedger from "../src/models/ReferralLedger.js";
import PayoutTransaction from "../src/models/PayoutTransaction.js";
import Notification from "../src/models/Notification.js";
import Deal from "../src/models/Deal.js";

import {
  getKycStatus,
  submitKyc,
  getPayoutAccount,
  setupPayoutAccount,
  getWalletBalance,
  withdrawFunds,
  getPayoutHistory,
} from "../src/application/influencer/InfluencerKycPayoutService.js";
import {
  getReferralSummary,
  getReferralsLedger,
  recordRegistrationReferral,
  handleDealCompletionReward,
} from "../src/application/influencer/ReferralService.js";
import {
  getXConnectUrl,
  handleXCallback,
  getXStats,
  disconnectX,
} from "../src/interfaces/http/controllers/xController.js";
import {
  getLinkedinConnectUrl,
  handleLinkedinCallback,
  getLinkedinStats,
  disconnectLinkedin,
} from "../src/interfaces/http/controllers/linkedinController.js";
import oauthCache from "../src/infrastructure/cache/cacheService.js";

const userId = "507f1f77bcf86cd799439011";
const mockUser = { userId, role: "influencer", mobile: "+919876543210" };

// ─── PART 1: X (Twitter) & LinkedIn OAuth Flow Tests ────────────────────────

test("X Controller: getXConnectUrl returns authorization URL with PKCE", async () => {
  let jsonResponse;
  const req = { user: mockUser };
  const res = {
    json: (payload) => {
      jsonResponse = payload;
      return res;
    },
    status: () => res,
  };

  process.env.X_CLIENT_ID = "mock-x-client-id";
  process.env.JWT_SECRET = "test-secret-x";

  await getXConnectUrl(req, res);
  assert.equal(jsonResponse.success, true);
  assert.ok(jsonResponse.url);
  assert.ok(jsonResponse.url.includes("twitter.com/i/oauth2/authorize"));
  assert.ok(jsonResponse.url.includes("code_challenge="));
  assert.ok(jsonResponse.url.includes("scope=tweet.read+users.read+offline.access"));
});

test("X Controller: handleXCallback redirects to success deep link or error deep link", async () => {
  let redirectedUrl;
  const res = {
    redirect: (url) => {
      redirectedUrl = url;
    },
  };

  // 1. Error param redirects to viralflight://oauth/x/error
  const reqError = { query: { error: "access_denied", error_description: "User denied" } };
  await handleXCallback(reqError, res);
  assert.ok(redirectedUrl.startsWith("viralflight://oauth/x/error"));

  // 2. Missing code or state
  const reqMissing = { query: {} };
  await handleXCallback(reqMissing, res);
  assert.ok(redirectedUrl.startsWith("viralflight://oauth/x/error"));
});

test("LinkedIn Controller: getLinkedinConnectUrl returns authorization URL", async () => {
  let jsonResponse;
  const req = { user: mockUser };
  const res = {
    json: (payload) => {
      jsonResponse = payload;
      return res;
    },
    status: () => res,
  };

  process.env.LINKEDIN_CLIENT_ID = "mock-linkedin-id";
  process.env.LINKEDIN_CLIENT_SECRET = "mock-linkedin-secret";

  await getLinkedinConnectUrl(req, res);
  assert.equal(jsonResponse.success, true);
  assert.ok(jsonResponse.url.includes("linkedin.com/oauth/v2/authorization"));
  assert.ok(jsonResponse.url.includes("scope=openid+profile+email"));
});

test("LinkedIn Controller: handleLinkedinCallback redirects error to deep link", async () => {
  let redirectedUrl;
  const res = {
    redirect: (url) => {
      redirectedUrl = url;
    },
  };

  const req = { query: { error: "user_cancelled_authorize" } };
  await handleLinkedinCallback(req, res);
  assert.ok(redirectedUrl.startsWith("viralflight://oauth/linkedin/error"));
});

// ─── PART 2: KYC & Payout Integration Tests ─────────────────────────────────

test("KYC Service: submitKyc validates format and masks PAN", async (t) => {
  const mockProfile = {
    userId,
    mobile: "+919876543210",
    kyc: { status: "not_submitted" },
    isModified: () => false,
    save: async () => {},
  };

  t.mock.method(InfluencerProfile, "findOne", () => mockProfile);

  // 1. Invalid PAN rejected
  await assert.rejects(
    submitKyc({
      user: mockUser,
      body: { panNumber: "INVALID12", panName: "Kartik Setia" },
    }),
    { statusCode: 400 }
  );

  // 2. Invalid GST rejected
  await assert.rejects(
    submitKyc({
      user: mockUser,
      body: {
        panNumber: "ABCDE1234F",
        panName: "Kartik Setia",
        gstNumber: "WRONGGST",
      },
    }),
    { statusCode: 400 }
  );

  // 3. Valid PAN and GST accepted
  const result = await submitKyc({
    user: mockUser,
    body: {
      panNumber: "ABCDE1234F",
      panName: "Kartik Setia",
      dob: "1995-08-12",
      gstNumber: "07AAAAA0000A1Z5",
    },
  });

  assert.equal(result.status, "verified");
  assert.equal(result.panNumber, "ABCDE****F"); // Masked format
  assert.equal(result.panName, "Kartik Setia");
  assert.equal(result.gstNumber, "07AAAAA0000A1Z5");
});

test("Payouts Service: setupPayoutAccount saves bank account and UPI with masking", async (t) => {
  const mockProfile = {
    userId,
    mobile: "+919876543210",
    payoutAccount: {},
    isModified: () => false,
    save: async () => {},
  };

  t.mock.method(InfluencerProfile, "findOne", () => mockProfile);

  // 1. Setup Bank Account
  const bankResult = await setupPayoutAccount({
    user: mockUser,
    body: {
      type: "bank_account",
      accountNumber: "123456789012",
      ifsc: "HDFC0001234",
      beneficiaryName: "Kartik Setia",
    },
  });

  assert.ok(bankResult.bankAccount);
  assert.equal(bankResult.bankAccount.accountNumberMasked, "••••••••9012");
  assert.equal(bankResult.bankAccount.ifsc, "HDFC0001234");
  assert.equal(bankResult.bankAccount.bankName, "HDFC Bank");
  assert.equal(bankResult.bankAccount.isVerified, true);

  // 2. Setup UPI
  const upiResult = await setupPayoutAccount({
    user: mockUser,
    body: {
      type: "upi",
      vpa: "kartik@okhdfcbank",
    },
  });

  assert.equal(upiResult.vpa, "kartik@okhdfcbank");
});

test("Payouts Service: withdrawFunds validates KYC, balance, and threshold", async (t) => {
  // 1. Unverified KYC fails with 403
  const unverifiedProfile = {
    _id: "507f1f77bcf86cd799439099",
    userId,
    mobile: "+919876543210",
    kyc: { status: "not_submitted" },
    wallet: { availableBalance: 10000 },
    payoutAccount: { vpa: "kartik@upi" },
    isModified: () => false,
  };

  t.mock.method(InfluencerProfile, "findOne", () => unverifiedProfile);

  await assert.rejects(
    withdrawFunds({
      user: mockUser,
      body: { amount: 1000, method: "upi" },
    }),
    { statusCode: 403, code: "KYC_NOT_VERIFIED" }
  );

  // 2. Amount below minimum threshold (₹500) fails with 400
  const verifiedProfile = {
    _id: "507f1f77bcf86cd799439099",
    userId,
    mobile: "+919876543210",
    kyc: { status: "verified" },
    wallet: { availableBalance: 10000, pendingClearance: 2000, lifetimeEarnings: 50000 },
    payoutAccount: {
      vpa: "kartik@upi",
      bankAccount: { isVerified: true, accountNumber: "1234567890", ifsc: "HDFC0001234" },
    },
    isModified: () => false,
  };

  t.mock.method(InfluencerProfile, "findOne", () => verifiedProfile);

  await assert.rejects(
    withdrawFunds({
      user: mockUser,
      body: { amount: 300, method: "upi" },
    }),
    { statusCode: 400 }
  );

  // 3. Amount > available balance fails
  t.mock.method(InfluencerProfile, "findOneAndUpdate", async () => null);

  await assert.rejects(
    withdrawFunds({
      user: mockUser,
      body: { amount: 15000, method: "upi" },
    }),
    { statusCode: 400 }
  );

  // 4. Successful withdrawal deducts balance and records transaction
  const updatedWalletProfile = {
    ...verifiedProfile,
    wallet: {
      availableBalance: 8000,
      pendingClearance: 2000,
      lifetimeEarnings: 50000,
      currency: "INR",
    },
  };

  t.mock.method(InfluencerProfile, "findOneAndUpdate", async () => updatedWalletProfile);
  t.mock.method(PayoutTransaction, "create", async (doc) => ({
    _id: "tx_mock_123",
    ...doc,
    createdAt: new Date(),
  }));

  const withdrawResult = await withdrawFunds({
    user: mockUser,
    body: { amount: 2000, method: "upi" },
  });

  assert.equal(withdrawResult.transaction.amount, 2000);
  assert.equal(withdrawResult.transaction.type, "withdrawal");
  assert.equal(withdrawResult.transaction.status, "processed");
  assert.equal(withdrawResult.balance.availableBalance, 8000);
});

// ─── PART 3: Referral Engine & Automated Deal Hook Tests ────────────────────

test("Referral Service: getReferralSummary creates referral code and returns metrics", async (t) => {
  const profileWithCode = {
    userId,
    mobile: "+919876543210",
    name: "Deeksha Sharma",
    referralCode: "DEEKSHA50",
    isModified: () => false,
    save: async () => {},
  };

  t.mock.method(InfluencerProfile, "findOne", () => profileWithCode);
  t.mock.method(ReferralLedger, "countDocuments", async (filter) => {
    if (filter?.status === "completed") return 3;
    return 8; // total joined
  });

  const summary = await getReferralSummary({ user: mockUser });

  assert.equal(summary.referralCode, "DEEKSHA50");
  assert.equal(summary.shareUrl, "https://viralflight.in/join?ref=DEEKSHA50");
  assert.equal(summary.totalJoined, 8);
  assert.equal(summary.totalRewarded, 3);
  assert.equal(summary.rewardPerReferral, 500);
  assert.equal(summary.totalEarned, 1500); // 3 * 500
  assert.equal(summary.pendingEarnings, 2500); // (8 - 3) * 500
});

test("Referral Service: recordRegistrationReferral attributes referrer", async (t) => {
  const referrerUserId = "507f1f77bcf86cd799439001";
  const newUserId = "507f1f77bcf86cd799439002";

  t.mock.method(InfluencerProfile, "findOne", () => ({
    select: () => ({
      lean: async () => ({
        userId: referrerUserId,
        name: "Deeksha Sharma",
      }),
    }),
  }));

  let updatedUserDoc;
  t.mock.method(User, "findByIdAndUpdate", async (_id, update) => {
    updatedUserDoc = update;
  });

  let upsertedLedger;
  t.mock.method(ReferralLedger, "findOneAndUpdate", async (_query, update) => {
    upsertedLedger = update.$setOnInsert;
    return upsertedLedger;
  });

  await recordRegistrationReferral({
    newUser: { _id: newUserId },
    referralCode: "DEEKSHA50",
  });

  assert.equal(String(updatedUserDoc.referredBy), referrerUserId);
  assert.equal(String(upsertedLedger.referrerUserId), referrerUserId);
  assert.equal(String(upsertedLedger.referredUserId), newUserId);
  assert.equal(upsertedLedger.status, "registered");
  assert.equal(upsertedLedger.rewardAmount, 500);
  assert.equal(upsertedLedger.isPaid, false);
});

test("Referral Service: handleDealCompletionReward triggers reward credit and notification", async (t) => {
  const creatorUserId = "507f1f77bcf86cd799439002";
  const referrerUserId = "507f1f77bcf86cd799439001";
  const dealId = "deal_777";

  const mockReferral = {
    _id: "ref_123",
    referrerUserId,
    referredUserId: creatorUserId,
    status: "registered",
    isPaid: false,
    rewardAmount: 500,
    save: async () => {},
  };

  t.mock.method(ReferralLedger, "findOne", async () => mockReferral);

  t.mock.method(User, "findById", () => ({
    select: () => ({ lean: async () => ({ displayName: "Priya Sharma" }) }),
  }));
  t.mock.method(InfluencerProfile, "findOne", () => ({
    select: () => ({ lean: async () => ({ name: "Priya Sharma" }) }),
  }));

  let walletUpdate;
  t.mock.method(InfluencerProfile, "findOneAndUpdate", async (_query, update) => {
    walletUpdate = update;
    return {};
  });

  let payoutTx;
  t.mock.method(PayoutTransaction, "create", async (doc) => {
    payoutTx = doc;
    return doc;
  });

  let notification;
  t.mock.method(Notification, "create", async (doc) => {
    notification = doc;
    return doc;
  });

  const deal = {
    _id: dealId,
    status: "completed",
    influencerUserId: creatorUserId,
  };

  const hookResult = await handleDealCompletionReward({ deal });

  assert.equal(hookResult.rewarded, true);
  assert.equal(mockReferral.status, "completed");
  assert.equal(mockReferral.isPaid, true);

  // Wallet credited ₹500
  assert.equal(walletUpdate.$inc["wallet.availableBalance"], 500);
  assert.equal(walletUpdate.$inc["wallet.lifetimeEarnings"], 500);

  // Ledger transaction created
  assert.equal(payoutTx.type, "referral_bonus");
  assert.equal(payoutTx.amount, 500);
  assert.equal(payoutTx.status, "processed");

  // In-app notification created
  assert.equal(notification.userId, referrerUserId);
  assert.ok(
    notification.body.includes(
      "You earned ₹500 referral bonus for Priya Sharma's first completed collaboration!"
    )
  );
});
