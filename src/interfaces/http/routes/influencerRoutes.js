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
  syncInstagram,
  disconnectInstagram,
} from "../controllers/instagramController.js";
import {
  getMediaKit,
  getRateCard,
  listBrandInvites,
  updateMediaKit,
  updateRateCard,
} from "../controllers/influencerAssetsController.js";
import {
  getHomeDashboardController,
  getCuratedCampaignsController,
  applyToCuratedCampaignController,
  toggleCampaignBookmarkController,
  getAutoMatchRateCardController,
  updateAutoMatchRateCardController,
  resetAutoMatchRateCardDefaultsController,
  getDealsSummaryController,
  getDealsController,
  acceptEscrowDealController,
  counterOfferDealController,
  submitMilestoneDraftController,
} from "../controllers/influencerFeatureSuiteController.js";
import { listAgencyInfluencers } from "../controllers/discoveryController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const profileViewerAuth = requireRoles(["agency", "brand"]);

// ─── 1. Influencer Home & Feed APIs ──────────────────────────────────────────
router.get("/home/dashboard", authMiddleware, getHomeDashboardController);
router.get("/campaigns/curated", authMiddleware, getCuratedCampaignsController);
router.post(
  "/campaigns/:campaignId/apply",
  authMiddleware,
  applyToCuratedCampaignController
);
router.post(
  "/campaigns/:campaignId/bookmark",
  authMiddleware,
  toggleCampaignBookmarkController
);

// ─── 2. Auto-Match Rate Card APIs ────────────────────────────────────────────
router.get("/rate-card", authMiddleware, getAutoMatchRateCardController);
router.put("/rate-card", authMiddleware, updateAutoMatchRateCardController);
router.post(
  "/rate-card/reset-defaults",
  authMiddleware,
  resetAutoMatchRateCardDefaultsController
);

// ─── 3. Deals, Sponsorships & Escrow Management ─────────────────────────────
router.get("/deals/summary", authMiddleware, getDealsSummaryController);
router.get("/deals", authMiddleware, getDealsController);
router.post(
  "/deals/:dealId/accept-escrow",
  authMiddleware,
  acceptEscrowDealController
);
router.post(
  "/deals/:dealId/counter-offer",
  authMiddleware,
  counterOfferDealController
);
router.post(
  "/deals/:dealId/milestones/:milestoneId/submit-draft",
  authMiddleware,
  submitMilestoneDraftController
);

// ─── Existing Onboarding, Profile & Asset APIs ──────────────────────────────
router.get("/onboarding-options", authMiddleware, getOnboardingOptions);
router.get("/profile", authMiddleware, getMyProfile);
router.get("/dashboard-stats", authMiddleware, getDashboardStats);
router.get("/brand-invites", authMiddleware, listBrandInvites);
router.get("/media-kit", authMiddleware, getMediaKit);
router.put("/media-kit", authMiddleware, updateMediaKit);
router.get("/campaigns-for-you", authMiddleware, listCampaignsForInfluencer);
router.get("/creators", authMiddleware, listAgencyInfluencers);
router.get("/applications", authMiddleware, listMyApplicationsController);
router.get(
  "/campaigns/:campaignId/application",
  authMiddleware,
  getMyApplicationForCampaignController
);
router.get("/instagram/connect-url", authMiddleware, getInstagramConnectUrl);
router.get("/instagram/callback", handleInstagramCallback);
router.get("/instagram/stats", authMiddleware, getInstagramStats);
<<<<<<< HEAD
router.post(
  "/instagram/sync",
  authMiddleware,
  socialSyncRateLimit,
  syncInstagram
);
router.post(
  "/instagram/disconnect",
  authMiddleware,
  disconnectInstagram
);
router.delete(
  "/instagram/disconnect",
  authMiddleware,
  disconnectInstagram
);
router.get(
  "/facebook/connect-url",
  authMiddleware,
  socialConnectRateLimit,
  getFacebookConnectUrl
);
router.get("/facebook/callback", handleFacebookCallback);
router.get("/facebook/stats", authMiddleware, getFacebookStats);
router.post(
  "/facebook/sync",
  authMiddleware,
  socialSyncRateLimit,
  syncFacebook
);
router.get(
  "/youtube/connect-url",
  authMiddleware,
  socialConnectRateLimit,
  getYoutubeConnectUrl
);
router.get("/youtube/callback", handleYoutubeCallback);
router.get("/youtube/stats", authMiddleware, getYoutubeStats);
router.post(
  "/youtube/sync",
  authMiddleware,
  socialSyncRateLimit,
  syncYoutube
);
=======
router.post("/instagram/sync", authMiddleware, syncInstagram);
>>>>>>> 542fda10a598293e5d98e294bf7584fb0afbb8bc
router.post("/full-onboarding", authMiddleware, saveFullOnboarding);
router.post("/profile-views", profileViewerAuth, recordProfileView);
router.post("/logout", authMiddleware, logout);

export default router;
