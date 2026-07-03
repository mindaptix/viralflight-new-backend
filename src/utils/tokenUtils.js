const jwt = require("jsonwebtoken");

const getRefreshSecret = () =>
  process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

const createTokens = (payload) => {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  });

  const refreshToken = jwt.sign(payload, getRefreshSecret(), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  });

  return { accessToken, refreshToken };
};

const verifyRefreshToken = (refreshToken) =>
  jwt.verify(refreshToken, getRefreshSecret());

module.exports = {
  createTokens,
  verifyRefreshToken,
};
