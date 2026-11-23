import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";
import {
  getReferralSummary,
  getReferralsLedger,
  validateReferralCode,
} from "../../../application/influencer/ReferralService.js";

export const getReferralSummaryController = asyncHandler(async (req, res) => {
  const result = await getReferralSummary({ user: req.user });
  sendSuccess(res, {
    message: "Referral summary retrieved successfully",
    ...result,
  });
});

export const getReferralsLedgerController = asyncHandler(async (req, res) => {
  const result = await getReferralsLedger({ user: req.user });
  sendSuccess(res, {
    message: "Referral ledger retrieved successfully",
    ...result,
  });
});

export const validateReferralCodeController = asyncHandler(async (req, res) => {
  const code =
    req.body?.code ||
    req.body?.referralCode ||
    req.query?.code ||
    req.query?.referralCode;

  const result = await validateReferralCode(code);

  if (!result.valid) {
    return res.status(400).json({
      success: false,
      valid: false,
      message: result.message,
    });
  }

  return res.status(200).json({
    success: true,
    valid: true,
    message: result.message,
    ...result,
  });
});
