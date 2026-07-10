import express from "express";

import {
  getMyProfile,
  getOnboardingOptions,
  saveFullOnboarding,
} from "../controllers/brandController.js";
import { logout } from "../controllers/authController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const brandAuth = requireRoles(["brand"]);

router.get("/onboarding-options", brandAuth, getOnboardingOptions);
router.get("/profile", brandAuth, getMyProfile);
router.post("/full-onboarding", brandAuth, saveFullOnboarding);
router.post("/logout", brandAuth, logout);

export default router;
