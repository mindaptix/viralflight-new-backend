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
  LinkedinApiError,
  LinkedinConfigError,
} from "../../../infrastructure/external/linkedin/LinkedinOAuthService.js";

const sendOAuthResult = (res, success, message = "") => {
  const deepLink = success
    ? "viralflight://oauth/linkedin/success"
    : `viralflight://oauth/linkedin/error?message=${encodeURIComponent(message || "Authentication failed")}`;
  return res.redirect(deepLink);
};

export const getLinkedinConnectUrl = async (req, res) => {
  try {
    const url = buildConnectUrl(req.user);
    return res.json({
      success: true,
      url,
      message: "LinkedIn connect URL generated successfully",
    });
  } catch (error) {
    const recognized =
      error instanceof LinkedinApiError || error instanceof LinkedinConfigError;
    return res.status(recognized ? error.statusCode : 500).json({
      success: false,
      message: error.message || "Unable to generate LinkedIn connect URL",
      code: error.code,
    });
  }
};

export const handleLinkedinCallback = async (req, res) => {
  try {
    const { code, state, error, error_description: errorDescription } = req.query;

    if (error) {
      return sendOAuthResult(res, false, errorDescription || String(error));
    }

    if (!code || !state) {
      return sendOAuthResult(
        res,
        false,
        "LinkedIn callback requires code and state"
      );
    }

    let stateData;
    try {
      stateData = getStateData(String(state));
    } catch (err) {
      return sendOAuthResult(res, false, err.message || "Invalid or expired state");
    }

    if (stateData.role && stateData.role !== "influencer") {
      return sendOAuthResult(
        res,
        false,
        "Only influencer accounts can connect LinkedIn"
      );
    }

    await connectFromOAuth({
      user: { userId: stateData.userId, role: stateData.role || "influencer" },
      platform: "linkedin",
      code: String(code),
      state: String(state),
    });

    return sendOAuthResult(res, true);
  } catch (error) {
    console.error("[linkedinController] handleLinkedinCallback error:", error);
    return sendOAuthResult(
      res,
      false,
      error.message || "Unable to connect LinkedIn"
    );
  }
};

export const getLinkedinStats = async (req, res) => {
  try {
    const stats = await getStats({ user: req.user, platform: "linkedin" });
    return res.json({
      success: true,
      isConnected: Boolean(stats.isConnected),
      handle: stats.handle || "",
      name: stats.name || "",
      followers: stats.followers ?? 0,
      profilePictureUrl: stats.profilePictureUrl || "",
      lastSyncedAt: stats.lastSyncedAt || null,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to fetch LinkedIn stats",
      code: error.code,
    });
  }
};

export const disconnectLinkedin = async (req, res) => {
  try {
    const connection = await getConnection(req.user.userId, "linkedin", true);
    if (connection?.isConnected) {
      try {
        await revokeStoredToken({
          encryptedToken: connection.accessToken,
          encryptedRefreshToken: connection.refreshToken,
        });
      } catch (err) {
        console.warn("[linkedin] Revocation warning:", err.message);
      }
    }

    await disconnectConnection({
      user: req.user,
      platform: "linkedin",
    });

    return res.json({
      success: true,
      message: "LinkedIn disconnected successfully",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to disconnect LinkedIn",
      code: error.code,
    });
  }
};
