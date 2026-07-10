import express from "express";

import {
  getMyProfile,
  getOnboardingOptions,
  saveFullOnboarding,
} from "../controllers/agencyController.js";
import { logout } from "../controllers/authController.js";
import {
  createAgencyCampaignController,
  listAgencyCampaigns,
} from "../controllers/campaignController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const agencyAuth = requireRoles(["agency"]);

router.get("/onboarding-options", agencyAuth, getOnboardingOptions);
router.get("/profile", agencyAuth, getMyProfile);
router.get("/campaigns", agencyAuth, listAgencyCampaigns);
router.post("/full-onboarding", agencyAuth, saveFullOnboarding);
router.post("/campaigns", agencyAuth, createAgencyCampaignController);
router.post("/logout", agencyAuth, logout);

export default router;
