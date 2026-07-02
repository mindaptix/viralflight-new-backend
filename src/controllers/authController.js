const twilio = require("twilio");
const jwt = require("jsonwebtoken");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const allowedRoles = ["agency", "influencer", "brand"];
const pendingOtpRoles = new Map();

const getDashboardPath = (role) => `/dashboard/${role}`;

exports.sendOtp = async (req, res) => {
  try {
    const { mobile, role } = req.body;

    if (!mobile) {
      return res
        .status(400)
        .json({ success: false, message: "Mobile number is required" });
    }

    if (!allowedRoles.includes(role)) {
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

    pendingOtpRoles.set(mobile, role);

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
    const selectedRole = pendingOtpRoles.get(mobile);

    if (!mobile || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Mobile number and OTP are required" });
    }

    if (!selectedRole) {
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

    const token = jwt.sign({ mobile, role: selectedRole }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    pendingOtpRoles.delete(mobile);

    res.json({
      success: true,
      message: "OTP verified successfully",
      selectedRole,
      dashboard: selectedRole,
      redirectTo: getDashboardPath(selectedRole),
      token,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
