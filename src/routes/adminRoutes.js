const express = require("express");
const router = express.Router();

const adminAuthMiddleware = require("../middleware/adminAuthMiddleware");
const {
  loginAdmin,
  getAdminMe,
  getOnboardingSettingsForAdmin,
  updateOnboardingSettingsForAdmin,
} = require("../controllers/adminController");

router.post("/login", loginAdmin);
router.get("/me", adminAuthMiddleware, getAdminMe);
router.get(
  "/onboarding-settings",
  adminAuthMiddleware,
  getOnboardingSettingsForAdmin
);
router.put(
  "/onboarding-settings",
  adminAuthMiddleware,
  updateOnboardingSettingsForAdmin
);

module.exports = router;
