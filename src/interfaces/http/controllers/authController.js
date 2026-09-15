import { container } from "../../../di/container.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";
import { deleteAccount as deleteAuthenticatedAccount } from '../../../application/auth/DeleteAccountService.js';

export const sendOtp = asyncHandler(async (req, res) => {
  const result = await container.sendOtpUseCase.execute(req.body);
  sendSuccess(res, result);
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const result = await container.verifyOtpUseCase.execute(req.body);
  sendSuccess(res, result);
});

export const refreshToken = asyncHandler(async (req, res) => {
  const result = await container.refreshTokenUseCase.execute({
    refreshToken: req.body.refreshToken,
  });
  sendSuccess(res, result);
});

export const logout = asyncHandler(async (req, res) => {
  const result = await container.logoutUseCase.execute({ user: req.user });
  sendSuccess(res, result);
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const confirmHeader = req.get('x-confirm-account-deletion');
  const confirmed = String(confirmHeader).trim().toLowerCase() === 'true';
  const result = await deleteAuthenticatedAccount({
    user: req.user,
    confirmed,
  });
  sendSuccess(res, result);
});
