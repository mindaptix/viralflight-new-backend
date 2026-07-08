import twilio from "twilio";

import AgencyProfile from "../models/AgencyProfile.js";
import User from "../models/User.js";
import { ALLOWED_ROLES } from "../constants/onboardingConstants.js";
import { normalizeMobile } from "../utils/mobileUtils.js";
import {
  createTokens,
  verifyRefreshToken,
  hashToken,
} from "../utils/tokenUtils.js";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const getDashboardPath = (role) => `/dashboard/${role}`;

export const sendOtp = async (req, res) => {
  try {
    const { role } = req.body;
    const mobile = normalizeMobile(req.body.mobile);

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message:
          "Valid mobile number is required. Use 10 digits or +91 format, e.g. +917018319344",
      });
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
      mobile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const mobile = normalizeMobile(req.body.mobile);

    if (!mobile || !otp) {
      return res.status(400).json({
        success: false,
        message: "Mobile number and OTP are required",
      });
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
    user.refreshTokenHash = hashToken(refreshToken);
    user.refreshTokenIssuedAt = new Date();
    await user.save();

    if (user.role === "agency") {
      await AgencyProfile.findOneAndUpdate(
        { userId: user._id },
        {
          userId: user._id,
          mobile,
        },
        { upsert: true, new: true, runValidators: true }
      );
    }

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

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: refreshTokenInput } = req.body;

    if (!refreshTokenInput) {
      return res
        .status(400)
        .json({ success: false, message: "Refresh token is required" });
    }

    const decoded = verifyRefreshToken(refreshTokenInput);
    const { userId, mobile, role } = decoded;

    const user = await User.findOne({
      _id: userId,
      mobile,
      role,
      isMobileVerified: true,
    }).select("+refreshTokenHash");

    if (!user || !user.refreshTokenHash) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid refresh token" });
    }

    const incomingRefreshTokenHash = hashToken(refreshTokenInput);

    if (incomingRefreshTokenHash !== user.refreshTokenHash) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid refresh token" });
    }

    const { accessToken, refreshToken: newRefreshToken } = createTokens({
      userId: user._id.toString(),
      mobile,
      role,
    });

    user.refreshTokenHash = hashToken(newRefreshToken);
    user.refreshTokenIssuedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: "Tokens refreshed successfully",
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid refresh token" });
  }
};
