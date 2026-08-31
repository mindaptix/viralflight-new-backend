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
} from "../controllers/instagramController.js";
import {
  getFacebookConnectUrl,
  getFacebookStats,
  handleFacebookCallback,
  syncFacebook,
} from "../controllers/facebookController.js";
import {
  getYoutubeConnectUrl,
  getYoutubeStats,
  handleYoutubeCallback,
  syncYoutube,
} from "../controllers/youtubeController.js";
import { rateLimit } from "../../../shared/http/rateLimitMiddleware.js";
import {
  getMediaKit,
  getRateCard,
  listBrandInvites,
  updateMediaKit,
  updateRateCard,
} from "../controllers/influencerAssetsController.js";
import { listAgencyInfluencers } from "../controllers/discoveryController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const profileViewerAuth = requireRoles(["agency", "brand"]);

router.get("/onboarding-options", authMiddleware, getOnboardingOptions);
router.get("/profile", authMiddleware, getMyProfile);
router.get("/dashboard-stats", authMiddleware, getDashboardStats);
router.get("/brand-invites", authMiddleware, listBrandInvites);
router.get("/rate-card", authMiddleware, getRateCard);
router.put("/rate-card", authMiddleware, updateRateCard);
router.get("/media-kit", authMiddleware, getMediaKit);
router.put("/media-kit", authMiddleware, updateMediaKit);
router.get("/campaigns-for-you", authMiddleware, listCampaignsForInfluencer);
router.get("/creators", authMiddleware, listAgencyInfluencers);
router.get("/applications", authMiddleware, listMyApplicationsController);
router.post(
  "/campaigns/:campaignId/apply",
  authMiddleware,
  applyToCampaignController
);
router.get(
  "/campaigns/:campaignId/application",
  authMiddleware,
  getMyApplicationForCampaignController
);
const socialConnectRateLimit = rateLimit({ max: 10, keyPrefix: "social-connect" });
const socialSyncRateLimit = rateLimit({ max: 10, keyPrefix: "social-sync" });

router.get(
  "/instagram/connect-url",
  authMiddleware,
  socialConnectRateLimit,
  getInstagramConnectUrl
);
router.get("/instagram/callback", handleInstagramCallback);
router.get("/instagram/stats", authMiddleware, getInstagramStats);
router.post(
  "/instagram/sync",
  authMiddleware,
  socialSyncRateLimit,
  syncInstagram
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
router.post("/full-onboarding", authMiddleware, saveFullOnboarding);
router.post("/profile-views", profileViewerAuth, recordProfileView);
router.post("/logout", authMiddleware, logout);

export default router;
