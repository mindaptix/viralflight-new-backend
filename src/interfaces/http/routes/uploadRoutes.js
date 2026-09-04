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

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);

const mimeFromExt = (filePath = "") => {
  const ext = path.extname(filePath || "").toLowerCase();
  return (
    {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".heic": "image/heic",
    }[ext] || ""
  );
};

const isAllowedImage = (file = {}) => {
  const mime = String(file.mimetype || "").toLowerCase().trim();
  if (/^image\//i.test(mime)) {
    return true;
  }

  // Dart/http + image_picker often send application/octet-stream with no/odd mime.
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (ALLOWED_EXT.has(ext)) {
    return true;
  }

  // Allow generic binary parts when the client omitted a real filename extension.
  if (!mime || mime === "application/octet-stream" || mime === "binary/octet-stream") {
    return true;
  }

  return false;
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, profileImagesDir);
  },
  filename: (_req, file, cb) => {
    const originalExt = path.extname(file.originalname || "").toLowerCase();
    const mimeExt =
      {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/heic": ".heic",
      }[String(file.mimetype || "").toLowerCase()] || "";
    const safeExt = ALLOWED_EXT.has(originalExt)
      ? originalExt
      : ALLOWED_EXT.has(mimeExt)
        ? mimeExt
        : ".jpg";
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedImage(file)) {
      cb(new ValidationError("Only jpg, png, webp images are allowed"));
      return;
    }
    // Normalize empty/generic mime so downstream URL logic stays consistent.
    if (!/^image\//i.test(file.mimetype || "")) {
      file.mimetype =
        mimeFromExt(file.originalname) || "image/jpeg";
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

const handleMulter = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof ValidationError || error?.name === "ValidationError") {
      next(error);
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(new ValidationError("Image must be 5MB or smaller"));
        return;
      }
      next(new ValidationError(error.message || "Image upload failed"));
      return;
    }

    next(
      new ValidationError(
        error?.message || "Image upload failed. Please try a jpg or png under 5MB."
      )
    );
  });
};

router.post(
  "/",
  anyAuth,
  handleMulter,
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
