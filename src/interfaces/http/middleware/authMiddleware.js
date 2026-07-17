import jwt from "jsonwebtoken";

const requireRoles = (allowedRoles = ["influencer"]) => (req, res, next) => {
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

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

const authMiddleware = requireRoles(["influencer"]);

export { requireRoles };
export default authMiddleware;
