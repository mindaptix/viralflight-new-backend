import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import {
  getMyProfile,
  getOnboardingOptions,
  saveFullOnboarding,
} from "../controllers/influencerController.js";

const router = express.Router();

router.get("/onboarding-options", authMiddleware, getOnboardingOptions);
router.get("/profile", authMiddleware, getMyProfile);
router.post("/full-onboarding", authMiddleware, saveFullOnboarding);

export default router;
