const twilio = require("twilio");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { ALLOWED_ROLES } = require("../constants/onboardingConstants");
const { createTokens, verifyRefreshToken } = require("../utils/tokenUtils");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const getDashboardPath = (role) => `/dashboard/${role}`;

exports.sendOtp = async (req, res) => {
  try {
    const { mobile, role } = req.body;

    if (!mobile) {
      return res
        .status(400)
        .json({ success: false, message: "Mobile number is required" });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Valid role is required: agency, influencer, or brand",
      });
    }

    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({
        to: mobile,
        channel: "sms",
      });

    await User.findOneAndUpdate(
      { mobile },
      {
        mobile,
        role,
        isMobileVerified: false,
        lastOtpRequestedAt: new Date(),
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "OTP sent successfully",
      selectedRole: role,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Mobile number and OTP are required" });
    }

    const user = await User.findOne({ mobile });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Please select a role and request OTP first",
      });
    }

    const result = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: mobile,
        code: otp,
      });

    if (result.status !== "approved") {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    const { accessToken, refreshToken } = createTokens({
      userId: user._id.toString(),
      mobile,
      role: user.role,
    });

    user.isMobileVerified = true;
    user.lastLoginAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: "OTP verified successfully",
      selectedRole: user.role,
      dashboard: user.role,
      redirectTo: getDashboardPath(user.role),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res
        .status(400)
        .json({ success: false, message: "Refresh token is required" });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const { userId, mobile, role } = decoded;

    const user = await User.findOne({
      _id: userId,
      mobile,
      role,
      isMobileVerified: true,
    });

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid refresh token" });
    }

    const accessToken = jwt.sign(
      { userId: user._id.toString(), mobile, role },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
      }
    );

    res.json({
      success: true,
      message: "Access token refreshed successfully",
      accessToken,
    });
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid refresh token" });
  }
};
