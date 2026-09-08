import express from "express";

import {
  createCampaignInvite,
  getCampaignDetail,
} from "../controllers/campaignPublicController.js";
import {
  campaignAiUpload,
  generateCampaignFromImage,
} from "../controllers/campaignAiController.js";
import { listPublicCampaigns } from "../controllers/campaignController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const appUserAuth = requireRoles(["influencer", "brand", "agency"]);
const ownerAuth = requireRoles(["brand", "agency"]);

// Campaign Marketplace — must be registered before /:campaignId
router.get("/", appUserAuth, listPublicCampaigns);

// AI Campaign Creation — must be registered before /:campaignId
router.post(
  "/ai/from-image",
  ownerAuth,
  campaignAiUpload.single("file"),
  generateCampaignFromImage
);

router.get("/:campaignId", appUserAuth, getCampaignDetail);
router.post("/:campaignId/invites", ownerAuth, createCampaignInvite);

export default router;

