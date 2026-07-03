const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const {
  getOnboardingSettings,
  updateOnboardingSettings,
} = require("../services/onboardingSettingsService");

const createAdminToken = (admin) =>
  jwt.sign(
    {
      adminId: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    },
    process.env.ADMIN_JWT_SECRET,
    { expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || "1d" }
  );

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    const admin = await Admin.findOne({
      email: email.trim().toLowerCase(),
      isActive: true,
    });

    if (!admin) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid admin credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);

    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid admin credentials" });
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    res.json({
      success: true,
      message: "Admin login successful",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      adminToken: createAdminToken(admin),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAdminMe = async (req, res) => {
  res.json({
    success: true,
    admin: req.admin,
  });
};

exports.getOnboardingSettingsForAdmin = async (req, res) => {
  try {
    const settings = await getOnboardingSettings();

    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateOnboardingSettingsForAdmin = async (req, res) => {
  try {
    if (req.admin.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Only super admin can update onboarding settings",
      });
    }

    const setting = await updateOnboardingSettings(req.body, req.admin._id);

    res.json({
      success: true,
      message: "Onboarding settings updated successfully",
      settings: setting.value,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};
