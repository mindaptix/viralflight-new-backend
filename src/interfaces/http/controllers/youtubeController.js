import {
  buildConnectUrl,
  verifyStateToken,
} from "../../../infrastructure/external/youtube/YoutubeOAuthService.js";
import {
  connectFromOAuth,
  getStats,
  syncConnection,
} from "../../../application/social/SocialConnectionService.js";
import { sendOAuthHtml } from "../../../shared/utils/oauthHtml.js";

const handleYoutubeError = (res, error, fallbackMessage) => {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: error.message || fallbackMessage,
    code: error.code,
  });
};

export const getYoutubeConnectUrl = async (req, res) => {
  try {
    const connectUrl = buildConnectUrl(req.user);

    res.json({
      success: true,
      connectUrl,
    });
  } catch (error) {
    handleYoutubeError(res, error, "Unable to generate YouTube connect URL");
  }
};

export const handleYoutubeCallback = async (req, res) => {
  try {
    const { code, state, error, error_description: errorDescription } = req.query;

    if (error) {
      return sendOAuthHtml(res, 400, {
        title: "YouTube connection failed",
        message: errorDescription || String(error),
        isSuccess: false,
      });
    }

    if (!code || !state) {
      return sendOAuthHtml(res, 400, {
        title: "YouTube connection failed",
        message: "Missing authorization code or state parameter.",
        isSuccess: false,
      });
    }

    const stateUser = verifyStateToken(String(state), "youtube");

    if (stateUser.role !== "influencer") {
      return sendOAuthHtml(res, 403, {
        title: "Access denied",
        message: "Only influencer accounts can connect YouTube.",
        isSuccess: false,
      });
    }

    await connectFromOAuth({
      user: stateUser,
      platform: "youtube",
      code: String(code),
    });

    return sendOAuthHtml(res, 200, {
      title: "YouTube connected successfully",
      message: "Return to Viral Flight app.",
      isSuccess: true,
    });
  } catch (error) {
    return sendOAuthHtml(res, error.statusCode || 500, {
      title: "YouTube connection failed",
      message: error.message || "Unable to connect YouTube.",
      isSuccess: false,
    });
  }
};

export const syncYoutube = async (req, res) => {
  try {
    const youtube = await syncConnection({
      user: req.user,
      platform: "youtube",
    });

    res.json({
      success: true,
      message: "YouTube synced",
      youtube,
    });
  } catch (error) {
    handleYoutubeError(res, error, "Unable to sync YouTube");
  }
};

export const getYoutubeStats = async (req, res) => {
  try {
    const youtube = await getStats({
      user: req.user,
      platform: "youtube",
    });

    res.json({
      success: true,
      youtube,
    });
  } catch (error) {
    handleYoutubeError(res, error, "Unable to fetch YouTube stats");
  }
};
