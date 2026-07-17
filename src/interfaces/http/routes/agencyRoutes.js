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
import { listCampaignApplicationsController } from "../controllers/campaignApplicationController.js";
import { listAgencyInfluencers } from "../controllers/discoveryController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const agencyAuth = requireRoles(["agency"]);

router.get("/onboarding-options", agencyAuth, getOnboardingOptions);
router.get("/profile", agencyAuth, getMyProfile);
router.get("/campaigns", agencyAuth, listAgencyCampaigns);
router.get(
  "/campaigns/:campaignId/applications",
  agencyAuth,
  listCampaignApplicationsController
);
router.get("/influencers", agencyAuth, listAgencyInfluencers);
router.post("/full-onboarding", agencyAuth, saveFullOnboarding);
router.post("/campaigns", agencyAuth, createAgencyCampaignController);
router.post("/logout", agencyAuth, logout);

export default router;
