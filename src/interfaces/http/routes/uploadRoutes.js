import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import express from "express";

import { requireRoles } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { ValidationError } from "../../../shared/errors/AppError.js";
import { sendSuccess } from "../../../shared/http/respond.js";

const uploadsRoot = path.resolve(process.cwd(), "uploads");
const profileImagesDir = path.join(uploadsRoot, "profile-images");

fs.mkdirSync(profileImagesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, profileImagesDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".heic"].includes(ext)
      ? ext
      : ".jpg";
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|jpg|png|webp|heic)$/i.test(file.mimetype || "");
    if (!ok) {
      cb(new ValidationError("Only jpg, png, webp images are allowed"));
      return;
    }
    cb(null, true);
  },
});

const publicBaseUrl = (req) => {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  }
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}`;
};

const anyAuth = requireRoles(["influencer", "brand", "agency"]);

const router = express.Router();

router.post(
  "/",
  anyAuth,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ValidationError("file is required");
    }

    const url = `${publicBaseUrl(req)}/uploads/profile-images/${req.file.filename}`;
    sendSuccess(res, {
      message: "Image uploaded successfully",
      url,
      publicUrl: url,
      data: { url, publicUrl: url },
    });
  })
);

router.post(
  "/presign",
  anyAuth,
  asyncHandler(async (_req, res) => {
    res.status(501).json({
      success: false,
      message:
        "Presigned uploads are not configured. Use multipart POST /api/uploads instead.",
    });
  })
);

export default router;
export { uploadsRoot };
