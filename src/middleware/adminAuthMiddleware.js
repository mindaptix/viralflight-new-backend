const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const adminAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "Admin token is required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    const admin = await Admin.findOne({
      _id: decoded.adminId,
      isActive: true,
    }).select("-passwordHash");

    if (!admin) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid admin token" });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res
      .status(401)
      .json({ success: false, message: "Invalid or expired admin token" });
  }
};

module.exports = adminAuthMiddleware;
