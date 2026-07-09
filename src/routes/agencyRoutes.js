import express from "express";

import {
  getMyProfile,
  getOnboardingOptions,
  saveFullOnboarding,
} from "../controllers/agencyController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const agencyAuth = requireRoles(["agency"]);

router.get("/onboarding-options", agencyAuth, getOnboardingOptions);
router.get("/me", agencyAuth, getMyProfile);
router.get("/profile", agencyAuth, getMyProfile);
router.post("/full-onboarding", agencyAuth, saveFullOnboarding);

export default router;
