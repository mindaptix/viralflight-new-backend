import express from "express";

import {
  completeAgencyProfile,
  getMyProfile,
  getOnboardingOptions,
  saveAgencyDetails,
  saveFocusServices,
  saveFullOnboarding,
  saveHowYouOperate,
  savePartialProfile,
} from "../controllers/agencyController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const agencyAuth = requireRoles(["agency"]);
const writeProfileRoutes = [
  "/",
  "/profile",
  "/details",
  "/agency-details",
  "/basic-info",
  "/setup",
  "/setup-agency",
  "/onboarding",
  "/save",
  "/update",
];

router.get("/onboarding-options", agencyAuth, getOnboardingOptions);
router.get("/me", agencyAuth, getMyProfile);
router.get("/profile", agencyAuth, getMyProfile);
router.post("/agency-details", agencyAuth, saveAgencyDetails);
router.post("/basic-info", agencyAuth, saveAgencyDetails);
router.post("/how-you-operate", agencyAuth, saveHowYouOperate);
router.post("/operate", agencyAuth, saveHowYouOperate);
router.post("/work", agencyAuth, saveHowYouOperate);
router.post("/focus-services", agencyAuth, saveFocusServices);
router.post("/focus", agencyAuth, saveFocusServices);
router.post("/services", agencyAuth, saveFocusServices);
router.post("/finish-profile", agencyAuth, saveFocusServices);
router.post("/complete-profile", agencyAuth, completeAgencyProfile);
router.post("/full-onboarding", agencyAuth, saveFullOnboarding);

for (const route of writeProfileRoutes) {
  router.post(route, agencyAuth, savePartialProfile);
  router.put(route, agencyAuth, savePartialProfile);
  router.patch(route, agencyAuth, savePartialProfile);
}

export default router;
