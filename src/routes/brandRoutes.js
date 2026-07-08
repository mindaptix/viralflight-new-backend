import express from "express";

import {
  completeBrandProfile,
  getMyProfile,
  getOnboardingOptions,
  saveBrandDetails,
  saveBrandProfile,
  saveCampaignPreferences,
  saveFullOnboarding,
  savePartialProfile,
} from "../controllers/brandController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const brandAuth = requireRoles(["brand"]);
const writeProfileRoutes = [
  "/",
  "/profile",
  "/details",
  "/brand-details",
  "/basic-info",
  "/setup",
  "/setup-brand",
  "/onboarding",
  "/save",
  "/update",
];

router.get("/onboarding-options", brandAuth, getOnboardingOptions);
router.get("/me", brandAuth, getMyProfile);
router.get("/profile", brandAuth, getMyProfile);
router.post("/brand-details", brandAuth, saveBrandDetails);
router.post("/basic-info", brandAuth, saveBrandDetails);
router.post("/brand-profile", brandAuth, saveBrandProfile);
router.post("/profile-details", brandAuth, saveBrandProfile);
router.post("/campaign-preferences", brandAuth, saveCampaignPreferences);
router.post("/campaigns", brandAuth, saveCampaignPreferences);
router.post("/finish-profile", brandAuth, saveCampaignPreferences);
router.post("/complete-profile", brandAuth, completeBrandProfile);
router.post("/full-onboarding", brandAuth, saveFullOnboarding);

for (const route of writeProfileRoutes) {
  router.post(route, brandAuth, savePartialProfile);
  router.put(route, brandAuth, savePartialProfile);
  router.patch(route, brandAuth, savePartialProfile);
}

export default router;
