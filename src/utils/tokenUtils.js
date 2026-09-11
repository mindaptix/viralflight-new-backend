import jwt from "jsonwebtoken";
import crypto from "crypto";

const getRefreshSecret = () =>
  process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

const createTokens = (payload) => {
  // App sessions stay active until the user logs out; do not attach JWT expiry.
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET);
  const refreshToken = jwt.sign(payload, getRefreshSecret());

  return { accessToken, refreshToken };
};

const verifyRefreshToken = (refreshToken) =>
  jwt.verify(refreshToken, getRefreshSecret());

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export {
  createTokens,
  verifyRefreshToken,
  hashToken,
};
