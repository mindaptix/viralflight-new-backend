import { container } from "../../../di/container.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";

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
