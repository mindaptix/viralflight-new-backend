import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";
import {
  getKycStatus,
  submitKyc,
  getPayoutAccount,
  setupPayoutAccount,
  getWalletBalance,
  withdrawFunds,
  getPayoutHistory,
} from "../../../application/influencer/InfluencerKycPayoutService.js";

export const getKycController = asyncHandler(async (req, res) => {
  const result = await getKycStatus({ user: req.user });
  sendSuccess(res, {
    message: "KYC status retrieved successfully",
    ...result,
  });
});

export const submitKycController = asyncHandler(async (req, res) => {
  const result = await submitKyc({ user: req.user, body: req.body });
  sendSuccess(res, {
    message: "KYC submitted successfully",
    ...result,
  });
});

export const getPayoutAccountController = asyncHandler(async (req, res) => {
  const result = await getPayoutAccount({ user: req.user });
  sendSuccess(res, {
    message: "Payout account retrieved successfully",
    ...result,
  });
});

export const setupPayoutAccountController = asyncHandler(async (req, res) => {
  const result = await setupPayoutAccount({ user: req.user, body: req.body });
  sendSuccess(res, {
    message: "Payout account saved successfully",
    ...result,
  });
});

export const getWalletBalanceController = asyncHandler(async (req, res) => {
  const result = await getWalletBalance({ user: req.user });
  sendSuccess(res, {
    message: "Wallet balance retrieved successfully",
    ...result,
  });
});

export const withdrawController = asyncHandler(async (req, res) => {
  const result = await withdrawFunds({ user: req.user, body: req.body });
  sendSuccess(res, {
    message: "Withdrawal processed successfully",
    ...result,
  });
});

export const getPayoutHistoryController = asyncHandler(async (req, res) => {
  const result = await getPayoutHistory({ user: req.user, query: req.query });
  sendSuccess(res, {
    message: "Payout history retrieved successfully",
    ...result,
  });
});
