const express = require("express");
const router = express.Router();

const {
  sendOtp,
  verifyOtp,
  refreshToken,
} = require("../controllers/authController");

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/refresh-token", refreshToken);

module.exports = router;
