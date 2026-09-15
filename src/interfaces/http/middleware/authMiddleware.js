import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from '../../../models/User.js';

const requireRoles = (allowedRoles = ["influencer"]) => async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "Access token is required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!allowedRoles.includes(decoded.role)) {
      return res.status(403).json({
        success: false,
        message: `Only ${allowedRoles.join(" or ")} accounts can access this route`,
      });
    }

    if (mongoose.connection?.readyState === 1) {
      const accountExists = await User.exists({
        _id: decoded.userId,
        role: decoded.role,
      });
      if (!accountExists) {
        return res.status(401).json({
          success: false,
          message: 'Account no longer exists',
        });
      }
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

const authMiddleware = requireRoles(["influencer"]);

export { requireRoles };
export default authMiddleware;
