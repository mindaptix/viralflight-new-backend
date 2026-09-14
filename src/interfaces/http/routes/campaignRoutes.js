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
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const appUserAuth = requireRoles(["influencer", "brand", "agency"]);
const ownerAuth = requireRoles(["brand", "agency"]);

router.get("/:campaignId", appUserAuth, getCampaignDetail);
router.post("/:campaignId/invites", ownerAuth, createCampaignInvite);

const management = new ManageCampaignUseCase({ campaignRepository: new CampaignRepository(), reportRepository: CampaignReport });
router.patch("/:campaignId/status", requireRoles(["agency"]), asyncHandler(async (req, res) => {
  const campaign = await management.execute({ campaignId: req.params.campaignId, user: req.user, action: req.body.action });
  sendSuccess(res, { message: "Campaign updated successfully", campaign });
}));
router.post("/:campaignId/reports", requireRoles(["influencer", "brand"]), asyncHandler(async (req, res) => {
  await management.execute({ campaignId: req.params.campaignId, user: req.user, action: "report", reason: req.body.reason });
  sendSuccess(res, { statusCode: 201, message: "Report submitted successfully" });
}));
router.delete("/:campaignId", requireRoles(["agency"]), asyncHandler(async (req, res) => {
  await management.execute({ campaignId: req.params.campaignId, user: req.user, action: "delete" });
  sendSuccess(res, { message: "Campaign deleted successfully" });
}));
export default router;
