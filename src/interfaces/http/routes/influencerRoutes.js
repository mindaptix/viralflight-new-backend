import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import { logout } from "../controllers/authController.js";
import {
  getDashboardStats,
  recordProfileView,
} from "../controllers/influencerDashboardController.js";
import { listCampaignsForInfluencer } from "../controllers/campaignController.js";
import {
  applyToCampaignController,
  getMyApplicationForCampaignController,
  listMyApplicationsController,
  withdrawApplicationController,
} from "../controllers/campaignApplicationController.js";
import {
  getMyProfile,
  getOnboardingOptions,
  saveFullOnboarding,
} from "../controllers/influencerController.js";
import {
  getInstagramConnectUrl,
  getInstagramStats,
  handleInstagramCallback,
  showInstagramCallbackError,
  showInstagramCallbackSuccess,
  syncInstagram,
} from "../controllers/instagramController.js";
import {
  disconnectYoutube,
  getYoutubeConnectUrl,
  getYoutubeStats,
  handleYoutubeCallback,
  syncYoutube,
} from "../controllers/youtubeController.js";
import {
  disconnectX,
  getXConnectUrl,
  getXStats,
  handleXCallback,
} from "../controllers/xController.js";
import {
  disconnectLinkedin,
  getLinkedinConnectUrl,
  getLinkedinStats,
  handleLinkedinCallback,
} from "../controllers/linkedinController.js";
import {
  getKycController,
  getPayoutAccountController,
  getPayoutHistoryController,
  getWalletBalanceController,
  setupPayoutAccountController,
  submitKycController,
  withdrawController,
} from "../controllers/influencerKycPayoutController.js";
import {
  getReferralSummaryController,
  getReferralsLedgerController,
} from "../controllers/influencerReferralController.js";
import {
  getMediaKit,
  getRateCard,
  listBrandInvites,
  respondToBrandInvite,
  updateMediaKit,
  updateRateCard,
} from "../controllers/influencerAssetsController.js";
import { listAgencyInfluencers } from "../controllers/discoveryController.js";
import { generateCampaignPitch } from "../controllers/campaignPitchController.js";
import { generateCreatorBio } from "../controllers/bioAiController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const profileViewerAuth = requireRoles(["agency", "brand"]);

router.get("/onboarding-options", authMiddleware, getOnboardingOptions);
router.get("/profile", authMiddleware, getMyProfile);
router.post('/profile/generate-bio', authMiddleware, generateCreatorBio);
router.get("/dashboard-stats", authMiddleware, getDashboardStats);
router.get("/brand-invites", authMiddleware, listBrandInvites);
router.patch("/brand-invites/:inviteId/respond", authMiddleware, respondToBrandInvite);
router.get("/rate-card", authMiddleware, getRateCard);
router.put("/rate-card", authMiddleware, updateRateCard);
router.get("/media-kit", authMiddleware, getMediaKit);
router.put("/media-kit", authMiddleware, updateMediaKit);
router.get("/campaigns-for-you", authMiddleware, listCampaignsForInfluencer);
router.get("/creators", authMiddleware, listAgencyInfluencers);
router.get("/applications", authMiddleware, listMyApplicationsController);
router.patch(
  "/applications/:applicationId/withdraw",
  authMiddleware,
  withdrawApplicationController
);
router.post(
  "/campaigns/:campaignId/apply",
  authMiddleware,
  applyToCampaignController
);
router.post('/campaigns/:campaignId/generate-pitch', authMiddleware, generateCampaignPitch);
router.get(
  "/campaigns/:campaignId/application",
  authMiddleware,
  getMyApplicationForCampaignController
);
router.get("/instagram/connect-url", authMiddleware, getInstagramConnectUrl);
router.get("/instagram/callback", handleInstagramCallback);
router.get("/instagram/callback-success", showInstagramCallbackSuccess);
router.get("/instagram/callback-error", showInstagramCallbackError);
router.get("/instagram/stats", authMiddleware, getInstagramStats);
router.post("/instagram/sync", authMiddleware, syncInstagram);
router.get("/youtube/connect-url", authMiddleware, getYoutubeConnectUrl);
router.get("/youtube/callback", handleYoutubeCallback);
router.get("/youtube/stats", authMiddleware, getYoutubeStats);
router.post("/youtube/sync", authMiddleware, syncYoutube);
router.delete("/youtube/disconnect", authMiddleware, disconnectYoutube);

// ─── PART 1: X (Twitter) & LinkedIn OAuth ───────────────────────────────────
router.get("/x/connect-url", authMiddleware, getXConnectUrl);
router.get("/x/callback", handleXCallback);
router.get("/x/stats", authMiddleware, getXStats);
router.delete("/x/disconnect", authMiddleware, disconnectX);

router.get("/linkedin/connect-url", authMiddleware, getLinkedinConnectUrl);
router.get("/linkedin/callback", handleLinkedinCallback);
router.get("/linkedin/stats", authMiddleware, getLinkedinStats);
router.delete("/linkedin/disconnect", authMiddleware, disconnectLinkedin);

// ─── PART 2: KYC & Payout Integration ───────────────────────────────────────
router.get("/kyc", authMiddleware, getKycController);
router.post("/kyc/submit", authMiddleware, submitKycController);

router.get("/payouts/account", authMiddleware, getPayoutAccountController);
router.post("/payouts/account", authMiddleware, setupPayoutAccountController);
router.get("/payouts/balance", authMiddleware, getWalletBalanceController);
router.post("/payouts/withdraw", authMiddleware, withdrawController);
router.get("/payouts/history", authMiddleware, getPayoutHistoryController);

// ─── PART 3: Referral Engine & Ledger ────────────────────────────────────────
router.get("/referrals/summary", authMiddleware, getReferralSummaryController);
router.get("/referrals/ledger", authMiddleware, getReferralsLedgerController);

router.post("/full-onboarding", authMiddleware, saveFullOnboarding);
router.post("/profile-views", profileViewerAuth, recordProfileView);
router.post("/logout", authMiddleware, logout);

export default router;
