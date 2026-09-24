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

export const showPrivacyPolicy = (_req, res) => {
  res.set("Cache-Control", "public, max-age=300");
  return res.status(200).type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Privacy Policy | ViralFlight</title>
    <style>
      body { margin: 0; background: #f8fafc; color: #0f172a; font-family: system-ui, sans-serif; }
      main { width: min(90%, 820px); margin: 48px auto; padding: 36px; border-radius: 20px; background: white; box-shadow: 0 16px 50px rgba(15,23,42,.1); }
      h1 { margin-top: 0; } h2 { margin-top: 30px; } p, li { line-height: 1.65; } .updated { color: #475569; }
    </style>
  </head>
  <body>
    <main>
      <h1>ViralFlight Privacy Policy</h1>
      <p class="updated">Last updated: September 24, 2026</p>
      <p>This Privacy Policy explains how ViralFlight collects, uses, stores and protects information when creators, brands and agencies use our mobile application, website and related services.</p>

      <h2>Information we collect</h2>
      <ul>
        <li>Account information, including your name, email address, role and authentication details.</li>
        <li>Profile and campaign information you submit, such as professional details, media-kit information, preferences, messages and campaign activity.</li>
        <li>Social-platform information you authorize us to access, which may include profile or Page identifiers, usernames, profile images, audience metrics, content statistics and analytics.</li>
        <li>Technical and usage information needed to operate, secure and improve the service, such as device information, diagnostics and interaction events.</li>
      </ul>

      <h2>Connected social accounts</h2>
      <p>When you connect services such as Facebook, Instagram or YouTube, ViralFlight accesses only the information covered by the permissions shown on that provider's authorization screen. OAuth access and refresh tokens are stored securely by our backend and are used to retrieve or refresh the data you requested. ViralFlight does not receive your social-platform password.</p>

      <h2>How we use information</h2>
      <ul>
        <li>Provide authentication, profiles, campaign discovery, collaboration, messaging, media kits and reporting.</li>
        <li>Display verified social statistics and synchronize authorized account data.</li>
        <li>Protect users, prevent abuse, diagnose problems and maintain service reliability.</li>
        <li>Comply with applicable law and enforce our terms.</li>
      </ul>

      <h2>Sharing and service providers</h2>
      <p>We do not sell personal information. We may share information with service providers that host, secure, analyze or support ViralFlight, with campaign participants when you choose to interact with them, when you direct us to do so, or when required by law. Connected platforms process information under their own privacy policies.</p>

      <h2>Retention and security</h2>
      <p>We retain information only while it is needed to provide ViralFlight, meet legal obligations, resolve disputes and protect the service. We use reasonable administrative, technical and organizational safeguards, including access controls and encryption for stored social OAuth tokens. No method of storage or transmission is completely secure.</p>

      <h2>Your choices and rights</h2>
      <p>You may update profile information, disconnect a social account, revoke access through the connected provider, or permanently delete your ViralFlight account. Depending on your location, you may also have rights to access, correct, export, restrict or object to processing of your personal information.</p>

      <h2>Account and data deletion</h2>
      <p>For deletion instructions, visit <a href="/api/v1/auth/data-deletion">ViralFlight account and data deletion</a>. Disconnecting a social account removes ViralFlight's stored connection and prevents future synchronization. You may also revoke ViralFlight directly from the connected platform's account settings.</p>

      <h2>Children</h2>
      <p>ViralFlight is not directed to children under 13, and we do not knowingly collect personal information from children under 13.</p>

      <h2>Changes to this policy</h2>
      <p>We may update this policy as the service or legal requirements change. We will update the date above and provide additional notice when required.</p>

      <h2>Contact</h2>
      <p>For privacy questions or requests, contact ViralFlight using the support email shown in the ViralFlight app or its official app-store listing.</p>
    </main>
  </body>
</html>`);
};
