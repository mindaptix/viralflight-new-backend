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
router.post("/full-onboarding", authMiddleware, saveFullOnboarding);
router.post("/profile-views", profileViewerAuth, recordProfileView);
router.post("/logout", authMiddleware, logout);

export default router;
