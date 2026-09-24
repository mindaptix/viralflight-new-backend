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

export const showDataDeletionInstructions = (_req, res) => {
  res.set("Cache-Control", "public, max-age=300");
  return res.status(200).type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Data deletion | ViralFlight</title>
    <style>
      body { margin: 0; min-height: 100vh; background: #f8fafc; color: #0f172a; font-family: system-ui, sans-serif; }
      main { width: min(90%, 720px); margin: 64px auto; padding: 36px; border-radius: 20px; background: white; box-shadow: 0 16px 50px rgba(15,23,42,.1); }
      h1 { margin-top: 0; } li { margin: 12px 0; line-height: 1.5; } p { line-height: 1.6; }
    </style>
  </head>
  <body>
    <main>
      <h1>ViralFlight account and data deletion</h1>
      <p>You can permanently delete your ViralFlight account and its associated data from the ViralFlight mobile app.</p>
      <ol>
        <li>Sign in to ViralFlight.</li>
        <li>Open your Profile and select Settings.</li>
        <li>Select <strong>Delete account</strong>.</li>
        <li>Review the warning and confirm permanent deletion.</li>
      </ol>
      <p>Deletion removes your ViralFlight profile, authentication data, stored social-account connections and access tokens. Data that must be retained for legal, fraud-prevention or security obligations may be kept only for the required retention period.</p>
      <p>If you cannot access the app, contact the ViralFlight support address shown in the app or its store listing and request account deletion from the email address associated with your account.</p>
    </main>
  </body>
</html>`);
};
