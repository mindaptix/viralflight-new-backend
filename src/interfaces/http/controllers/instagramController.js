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
  disconnectConnection,
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

export const getInstagramConnectUrl = async (req, res) => {
  try {
    const connectUrl = buildConnectUrl(req.user, "instagram");

    res.json({
      success: true,
      connectUrl,
    });
  } catch (error) {
    handleMetaError(res, error, "Unable to generate Instagram connect URL");
  }
};

export const handleInstagramCallback = async (req, res) => {
  try {
    const { code, state, error, error_description: errorDescription } = req.query;

    if (error) {
      return sendOAuthHtml(res, 400, {
        title: "Instagram connection failed",
        message: errorDescription || String(error),
        isSuccess: false,
      });
    }

    if (!code || !state) {
      return sendOAuthHtml(res, 400, {
        title: "Instagram connection failed",
        message: "Missing authorization code or state parameter.",
        isSuccess: false,
      });
    }

    const stateUser = verifyStateToken(String(state), "instagram");

    if (stateUser.role !== "influencer") {
      return sendOAuthHtml(res, 403, {
        title: "Access denied",
        message: "Only influencer accounts can connect Instagram.",
        isSuccess: false,
      });
    }

    await connectFromOAuth({
      user: stateUser,
      platform: "instagram",
      code: String(code),
    });

    return sendOAuthHtml(res, 200, {
      title: "Instagram connected successfully",
      message: "Return to Viral Flight app.",
      isSuccess: true,
    });
  } catch (error) {
    return sendOAuthHtml(res, error.statusCode || 500, {
      title: "Instagram connection failed",
      message: error.message || "Unable to connect Instagram.",
      isSuccess: false,
    });
  }
};

export const syncInstagram = async (req, res) => {
  try {
    const instagram = await syncConnection({
      user: req.user,
      platform: "instagram",
    });

    res.json({
      success: true,
      message: "Instagram synced",
      instagram,
    });
  } catch (error) {
    handleMetaError(res, error, "Unable to sync Instagram");
  }
};

export const getInstagramStats = async (req, res) => {
  try {
    const instagram = await getStats({
      user: req.user,
      platform: "instagram",
    });

    res.json({
      success: true,
      instagram,
    });
  } catch (error) {
    handleMetaError(res, error, "Unable to fetch Instagram stats");
  }
};

export const disconnectInstagram = async (req, res) => {
  try {
    const instagram = await disconnectConnection({
      user: req.user,
      platform: "instagram",
    });

    res.json({
      success: true,
      message: "Instagram disconnected successfully",
      instagram,
    });
  } catch (error) {
    handleMetaError(res, error, "Unable to disconnect Instagram");
  }
};
