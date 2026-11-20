import {
  connectFromOAuth,
  disconnectConnection,
  getConnection,
  getStats,
} from "../../../application/social/SocialConnectionService.js";
import {
  buildConnectUrl,
  getStateData,
  revokeStoredToken,
  XApiError,
  XConfigError,
} from "../../../infrastructure/external/x/XOAuthService.js";

const sendOAuthResult = (res, success, message = "") => {
  const deepLink = success
    ? "viralflight://oauth/x/success"
    : `viralflight://oauth/x/error?message=${encodeURIComponent(message || "Authentication failed")}`;
  return res.redirect(deepLink);
};

export const getXConnectUrl = async (req, res) => {
  try {
    const url = buildConnectUrl(req.user);
    return res.json({
      success: true,
      url,
      message: "X connect URL generated successfully",
    });
  } catch (error) {
    const recognized = error instanceof XApiError || error instanceof XConfigError;
    return res.status(recognized ? error.statusCode : 500).json({
      success: false,
      message: error.message || "Unable to generate X connect URL",
      code: error.code,
    });
  }
};

export const handleXCallback = async (req, res) => {
  try {
    const { code, state, error, error_description: errorDescription } = req.query;

    if (error) {
      return sendOAuthResult(res, false, errorDescription || String(error));
    }

    if (!code || !state) {
      return sendOAuthResult(res, false, "X callback requires code and state");
    }

    let stateData;
    try {
      stateData = getStateData(String(state));
    } catch (err) {
      return sendOAuthResult(res, false, err.message || "Invalid or expired state");
    }

    if (stateData.role && stateData.role !== "influencer") {
      return sendOAuthResult(res, false, "Only influencer accounts can connect X");
    }

    await connectFromOAuth({
      user: { userId: stateData.userId, role: stateData.role || "influencer" },
      platform: "x",
      code: String(code),
      state: String(state),
    });

    return sendOAuthResult(res, true);
  } catch (error) {
    console.error("[xController] handleXCallback error:", error);
    return sendOAuthResult(res, false, error.message || "Unable to connect X");
  }
};

export const getXStats = async (req, res) => {
  try {
    const stats = await getStats({ user: req.user, platform: "x" });
    return res.json({
      success: true,
      isConnected: Boolean(stats.isConnected),
      handle: stats.handle || "",
      followers: stats.followers ?? 0,
      posts: stats.posts ?? 0,
      profilePictureUrl: stats.profilePictureUrl || "",
      lastSyncedAt: stats.lastSyncedAt || null,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to fetch X stats",
      code: error.code,
    });
  }
};

export const disconnectX = async (req, res) => {
  try {
    const connection = await getConnection(req.user.userId, "x", true);
    if (connection?.isConnected) {
      try {
        await revokeStoredToken({
          encryptedToken: connection.accessToken,
          encryptedRefreshToken: connection.refreshToken,
        });
      } catch (err) {
        console.warn("[x] Revocation failed:", err.message);
      }
    }

    await disconnectConnection({
      user: req.user,
      platform: "x",
    });

    return res.json({
      success: true,
      message: "X disconnected successfully",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to disconnect X",
      code: error.code,
    });
  }
};
