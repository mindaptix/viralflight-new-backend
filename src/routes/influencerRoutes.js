import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import { logout } from "../controllers/authController.js";
import {
  getDashboardStats,
  recordProfileView,
} from "../controllers/influencerDashboardController.js";
import { listCampaignsForInfluencer } from "../controllers/campaignController.js";
import {
  getMyProfile,
  getOnboardingOptions,
  saveFullOnboarding,
} from "../controllers/influencerController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const profileViewerAuth = requireRoles(["agency", "brand"]);

router.get("/onboarding-options", authMiddleware, getOnboardingOptions);
router.get("/profile", authMiddleware, getMyProfile);
router.get("/dashboard-stats", authMiddleware, getDashboardStats);
router.get("/campaigns-for-you", authMiddleware, listCampaignsForInfluencer);
router.post("/full-onboarding", authMiddleware, saveFullOnboarding);
router.post("/profile-views", profileViewerAuth, recordProfileView);
router.post("/logout", authMiddleware, logout);

export default router;
