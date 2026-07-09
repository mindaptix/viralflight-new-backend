import express from "express";

import {
  logout,
  sendOtp,
  verifyOtp,
  refreshToken,
} from "../controllers/authController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const requireAuth = requireRoles(["agency", "influencer", "brand"]);

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/refresh-token", refreshToken);
router.post("/logout", requireAuth, logout);

export default router;
