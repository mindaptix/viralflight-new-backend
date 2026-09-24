import {
  connectFromOAuth,
  disconnectConnection,
  getConnection,
  getStats,
  syncConnection,
} from "../../../application/social/SocialConnectionService.js";
import {
  buildConnectUrl,
  revokeStoredToken,
  verifyStateToken,
  YoutubeApiError,
  YoutubeConfigError,
} from "../../../infrastructure/external/youtube/YoutubeOAuthService.js";

const sendOAuthResult = (res, statusCode, payload) => {
  const redirectBase = payload.success
    ? process.env.YOUTUBE_OAUTH_SUCCESS_REDIRECT
    : process.env.YOUTUBE_OAUTH_ERROR_REDIRECT;

  if (!redirectBase) return res.status(statusCode).json(payload);

  const url = new URL(redirectBase);
  url.searchParams.set("youtubeConnected", payload.success ? "1" : "0");
  if (!payload.success) url.searchParams.set("error", payload.message);
  return res.redirect(url.toString());
};

const sendError = (res, error, fallback) => {
  const recognized =
    error instanceof YoutubeApiError || error instanceof YoutubeConfigError;
  return res.status(recognized ? error.statusCode : error.statusCode || 500).json({
    success: false,
    message: error.message || fallback,
    code: error.code,
  });
};

export const getYoutubeConnectUrl = async (req, res) => {
  try {
    return res.json({
      success: true,
      message: "YouTube connect URL generated successfully",
      connectUrl: buildConnectUrl(req.user),
      expiresInSeconds: 600,
    });
  } catch (error) {
    return sendError(res, error, "Unable to generate YouTube connect URL");
  }
};

export const handleYoutubeCallback = async (req, res) => {
  try {
    const { code, state, error, error_description: errorDescription } = req.query;
    if (error) {
      return sendOAuthResult(res, 400, {
        success: false,
        message: errorDescription || String(error),
      });
    }
    if (!code || !state) {
      return sendOAuthResult(res, 400, {
        success: false,
        message: "YouTube callback requires code and state",
      });
    }

    const stateUser = verifyStateToken(String(state));
    if (stateUser.role !== "influencer") {
      return sendOAuthResult(res, 403, {
        success: false,
        message: "Only influencer accounts can connect YouTube",
      });
    }

    const youtube = await connectFromOAuth({
      user: stateUser,
      platform: "youtube",
      code: String(code),
    });
    return sendOAuthResult(res, 200, {
      success: true,
      message: "YouTube connected successfully",
      youtube,
    });
  } catch (error) {
    return sendOAuthResult(res, error.statusCode || 500, {
      success: false,
      message: error.message || "Unable to connect YouTube",
      code: error.code,
    });
  }
};

export const getYoutubeStats = async (req, res) => {
  try {
    const youtube = await getStats({ user: req.user, platform: "youtube" });
    return res.json({
      success: true,
      message: "YouTube stats fetched successfully",
      youtube,
    });
  } catch (error) {
    return sendError(res, error, "Unable to fetch YouTube stats");
  }
};

export const syncYoutube = async (req, res) => {
  try {
    const youtube = await syncConnection({
      user: req.user,
      platform: "youtube",
    });
    return res.json({
      success: true,
      message: "YouTube synced successfully",
      youtube,
    });
  } catch (error) {
    return sendError(res, error, "Unable to sync YouTube");
  }
};

export const disconnectYoutube = async (req, res) => {
  try {
    const connection = await getConnection(req.user.userId, "youtube", true);
    if (connection?.isConnected) {
      try {
        await revokeStoredToken({
          encryptedToken: connection.accessToken,
          encryptedRefreshToken: connection.refreshToken,
        });
      } catch (error) {
        // Always honor a user's disconnect request locally, even if Google's
        // revocation endpoint is temporarily unavailable.
        console.warn("[youtube] Google token revocation failed:", error.message);
      }
    }
    const youtube = await disconnectConnection({
      user: req.user,
      platform: "youtube",
    });
    return res.json({
      success: true,
      message: "YouTube disconnected successfully",
      youtube,
    });
  } catch (error) {
    return sendError(res, error, "Unable to disconnect YouTube");
  }
};
