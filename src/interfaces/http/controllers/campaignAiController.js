import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";

import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";
import { ValidationError } from "../../../shared/errors/AppError.js";
import { generateCampaignDraftFromImage } from "../../../application/campaigns/services/generateCampaignFromImage.js";
import { uploadsRoot } from "../routes/uploadRoutes.js";

const aiTempDir = path.join(uploadsRoot, "ai-temp");
fs.mkdirSync(aiTempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, aiTempDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".heic"].includes(ext)
      ? ext
      : ".jpg";
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${safeExt}`);
  },
});

export const campaignAiUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || "").toLowerCase();
    const ext = path.extname(file.originalname || "").toLowerCase();
    const okMime = /^image\/(jpeg|jpg|png|webp|heic)$/i.test(mime);
    const okExt = [".jpg", ".jpeg", ".png", ".webp", ".heic"].includes(ext);
    const okBinary =
      !mime ||
      mime === "application/octet-stream" ||
      mime === "binary/octet-stream";
    if (!okMime && !okExt && !okBinary) {
      cb(new ValidationError("Only jpg, png, webp images are allowed"));
      return;
    }
    if (!okMime) {
      file.mimetype =
        {
          ".png": "image/png",
          ".webp": "image/webp",
          ".heic": "image/heic",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
        }[ext] || "image/jpeg";
    }
    cb(null, true);
  },
});

const cleanup = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (_) {}
};

export const generateCampaignFromImage = asyncHandler(async (req, res) => {
  const imageUrl =
    typeof req.body?.imageUrl === "string" ? req.body.imageUrl.trim() : "";
  const filePath = req.file?.path;

  if (!imageUrl && !filePath) {
    throw new ValidationError("Upload an image or provide imageUrl");
  }

  try {
    const draft = await generateCampaignDraftFromImage({
      imageUrl: imageUrl || undefined,
      filePath: filePath || undefined,
      mimeType: req.file?.mimetype,
    });

    sendSuccess(res, {
      message: "Campaign draft generated from image",
      draft,
      data: draft,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not generate campaign draft";
    if (
      message.toLowerCase().includes("not configured") ||
      message.toLowerCase().includes("openai")
    ) {
      throw new ValidationError(message);
    }
    throw new ValidationError(message);
  } finally {
    await cleanup(filePath);
  }
});
