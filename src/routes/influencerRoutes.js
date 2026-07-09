import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import {
  saveFullOnboarding,
  getMyProfile,
  getFullProfile,
  getPlatformOptions,
  getOnboardingOptions,
} from "../controllers/influencerController.js";

const router = express.Router();

router.get("/onboarding-options", authMiddleware, getOnboardingOptions);
router.get("/platform-options", authMiddleware, getPlatformOptions);
router.get("/me", authMiddleware, getMyProfile);
router.get("/profile", authMiddleware, getFullProfile);
router.post("/full-onboarding", authMiddleware, saveFullOnboarding);

export default router;
