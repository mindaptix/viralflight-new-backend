import {
  MetaApiError,
  MetaConfigError,
  buildConnectUrl,
  verifyStateToken,
} from "../../../infrastructure/external/meta/MetaGraphService.js";
import {
  connectFromOAuth,
  getStats,
  syncConnection,
} from "../../../application/social/SocialConnectionService.js";
import { sendOAuthHtml } from "../../../shared/utils/oauthHtml.js";

const handleMetaError = (res, error, fallbackMessage) => {
  const statusCode =
    error instanceof MetaConfigError || error instanceof MetaApiError
      ? error.statusCode
      : 500;

  return res.status(statusCode).json({
    success: false,
    message: error.message || fallbackMessage,
    code: error.code,
  });
};

export const getFacebookConnectUrl = async (req, res) => {
  try {
    const connectUrl = buildConnectUrl(req.user, "facebook");

    res.json({
      success: true,
      connectUrl,
    });
  } catch (error) {
    handleMetaError(res, error, "Unable to generate Facebook connect URL");
  }
};

export const handleFacebookCallback = async (req, res) => {
  try {
    const { code, state, error, error_description: errorDescription } = req.query;

    if (error) {
      return sendOAuthHtml(res, 400, {
        title: "Facebook connection failed",
        message: errorDescription || String(error),
        isSuccess: false,
      });
    }

    if (!code || !state) {
      return sendOAuthHtml(res, 400, {
        title: "Facebook connection failed",
        message: "Missing authorization code or state parameter.",
        isSuccess: false,
      });
    }

    const stateUser = verifyStateToken(String(state), "facebook");

    if (stateUser.role !== "influencer") {
      return sendOAuthHtml(res, 403, {
        title: "Access denied",
        message: "Only influencer accounts can connect Facebook.",
        isSuccess: false,
      });
    }

    await connectFromOAuth({
      user: stateUser,
      platform: "facebook",
      code: String(code),
    });

    return sendOAuthHtml(res, 200, {
      title: "Facebook connected successfully",
      message: "Return to Viral Flight app.",
      isSuccess: true,
    });
  } catch (error) {
    return sendOAuthHtml(res, error.statusCode || 500, {
      title: "Facebook connection failed",
      message: error.message || "Unable to connect Facebook.",
      isSuccess: false,
    });
  }
};

export const syncFacebook = async (req, res) => {
  try {
    const facebook = await syncConnection({
      user: req.user,
      platform: "facebook",
    });

    res.json({
      success: true,
      message: "Facebook synced",
      facebook,
    });
  } catch (error) {
    handleMetaError(res, error, "Unable to sync Facebook");
  }
};

export const getFacebookStats = async (req, res) => {
  try {
    const facebook = await getStats({
      user: req.user,
      platform: "facebook",
    });

    res.json({
      success: true,
      facebook,
    });
  } catch (error) {
    handleMetaError(res, error, "Unable to fetch Facebook stats");
  }
};
