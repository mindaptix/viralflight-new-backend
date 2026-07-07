import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import {
  saveBasicInfo,
  connectPlatform,
  saveContentPreferences,
  finishProfile,
  getMyProfile,
  getPlatformOptions,
  getOnboardingOptions,
} from "../controllers/influencerController.js";

const router = express.Router();

router.get("/onboarding-options", authMiddleware, getOnboardingOptions);
router.get("/platform-options", authMiddleware, getPlatformOptions);
router.get("/me", authMiddleware, getMyProfile);
router.post("/basic-info", authMiddleware, saveBasicInfo);
router.post("/connect-platform", authMiddleware, connectPlatform);
router.post("/content-preferences", authMiddleware, saveContentPreferences);
router.post("/finish-profile", authMiddleware, finishProfile);
router.post("/complete-profile", authMiddleware, finishProfile);

export default router;
