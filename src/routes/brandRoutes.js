import express from "express";

import {
  getMyProfile,
  getOnboardingOptions,
  saveFullOnboarding,
} from "../controllers/brandController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const brandAuth = requireRoles(["brand"]);

router.get("/onboarding-options", brandAuth, getOnboardingOptions);
router.get("/me", brandAuth, getMyProfile);
router.get("/profile", brandAuth, getMyProfile);
router.post("/full-onboarding", brandAuth, saveFullOnboarding);

export default router;
