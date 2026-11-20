import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";
import {
  getReferralSummary,
  getReferralsLedger,
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
