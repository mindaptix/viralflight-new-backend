import express from "express";

import {
  sendOtp,
  verifyOtp,
  refreshToken,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/refresh-token", refreshToken);

export default router;
