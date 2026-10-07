import multer from 'multer';
import { analyzeCampaignImage } from '../../../application/campaigns/analyzeCampaignImage.js';
import { ValidationError, TooManyRequestsError } from '../../../shared/errors/AppError.js';
import { ManageCampaignUseCase } from "../../../application/campaigns/usecases/ManageCampaignUseCase.js";
import { CampaignRepository } from "../../../infrastructure/persistence/mongoose/repositories/CampaignRepository.js";
import CampaignReport from "../../../models/CampaignReport.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";
import express from "express";

import {
  createCampaignInvite,
  getCampaignDetail,
} from "../controllers/campaignPublicController.js";
import { listPublicCampaigns } from "../controllers/campaignController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const appUserAuth = requireRoles(["influencer", "brand", "agency"]);
const ownerAuth = requireRoles(["brand", "agency"]);

const analysisUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 } });
const analysisAttempts = new Map();
const analysisThrottle = (req, _res, next) => {
  const now = Date.now();
  for (const [id, expires] of analysisAttempts) if (expires <= now) analysisAttempts.delete(id);
  const id = String(req.user.userId);
  if (analysisAttempts.has(id)) return next(new TooManyRequestsError('Please wait a moment before analyzing another image.'));
  analysisAttempts.set(id, now + 15000);
  next();
};
router.post('/analyze-image', requireRoles(['agency']), analysisThrottle, analysisUpload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new ValidationError('A campaign image is required.');
  const suggestions = await analyzeCampaignImage({ buffer: req.file.buffer });
  sendSuccess(res, { suggestions });
}));

router.get("/", appUserAuth, listPublicCampaigns);
router.get("/:campaignId", appUserAuth, getCampaignDetail);
router.post("/:campaignId/invites", ownerAuth, createCampaignInvite);

const management = new ManageCampaignUseCase({ campaignRepository: new CampaignRepository(), reportRepository: CampaignReport });
router.patch("/:campaignId/status", ownerAuth, asyncHandler(async (req, res) => {
  const campaign = await management.execute({ campaignId: req.params.campaignId, user: req.user, action: req.body?.action });
  sendSuccess(res, { message: "Campaign updated successfully", campaign });
}));
router.post("/:campaignId/reports", requireRoles(["influencer", "brand"]), asyncHandler(async (req, res) => {
  await management.execute({ campaignId: req.params.campaignId, user: req.user, action: "report", reason: req.body?.reason });
  sendSuccess(res, { statusCode: 201, message: "Report submitted successfully" });
}));
router.delete("/:campaignId", requireRoles(["agency"]), asyncHandler(async (req, res) => {
  await management.execute({ campaignId: req.params.campaignId, user: req.user, action: "delete" });
  sendSuccess(res, { message: "Campaign deleted successfully" });
}));
export default router;
