import express from "express";

import {
  getMyProfile,
  getOnboardingOptions,
  saveFullOnboarding,
} from "../controllers/brandController.js";
import { logout } from "../controllers/authController.js";
import {
  createCampaign,
  listBrandCampaigns,
} from "../controllers/campaignController.js";
import { listCampaignApplicationsController } from "../controllers/campaignApplicationController.js";
import { listBrandCreators } from "../controllers/discoveryController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const brandAuth = requireRoles(["brand"]);

router.get("/onboarding-options", brandAuth, getOnboardingOptions);
router.get("/profile", brandAuth, getMyProfile);
router.get("/campaigns", brandAuth, listBrandCampaigns);
router.get(
  "/campaigns/:campaignId/applications",
  brandAuth,
  listCampaignApplicationsController
);
router.get("/creators", brandAuth, listBrandCreators);
router.post("/full-onboarding", brandAuth, saveFullOnboarding);
router.post("/campaigns", brandAuth, createCampaign);
router.post("/logout", brandAuth, logout);

export default router;
