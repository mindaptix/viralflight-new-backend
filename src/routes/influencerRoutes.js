const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  saveBasicInfo,
  connectPlatform,
  saveContentPreferences,
  finishProfile,
  getMyProfile,
  getPlatformOptions,
  getOnboardingOptions,
} = require("../controllers/influencerController");

router.get("/onboarding-options", authMiddleware, getOnboardingOptions);
router.get("/platform-options", authMiddleware, getPlatformOptions);
router.get("/me", authMiddleware, getMyProfile);
router.post("/basic-info", authMiddleware, saveBasicInfo);
router.post("/connect-platform", authMiddleware, connectPlatform);
router.post("/content-preferences", authMiddleware, saveContentPreferences);
router.post("/finish-profile", authMiddleware, finishProfile);
router.post("/complete-profile", authMiddleware, finishProfile);

module.exports = router;
