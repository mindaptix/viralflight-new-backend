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
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const profileViewerAuth = requireRoles(["agency", "brand"]);

router.get("/onboarding-options", authMiddleware, getOnboardingOptions);
router.get("/profile", authMiddleware, getMyProfile);
router.get("/dashboard-stats", authMiddleware, getDashboardStats);
router.get("/campaigns-for-you", authMiddleware, listCampaignsForInfluencer);
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
router.get("/instagram/connect-url", authMiddleware, getInstagramConnectUrl);
router.get("/instagram/callback", handleInstagramCallback);
router.get("/instagram/stats", authMiddleware, getInstagramStats);
router.post("/instagram/sync", authMiddleware, syncInstagram);
router.post("/full-onboarding", authMiddleware, saveFullOnboarding);
router.post("/profile-views", profileViewerAuth, recordProfileView);
router.post("/logout", authMiddleware, logout);

export default router;
