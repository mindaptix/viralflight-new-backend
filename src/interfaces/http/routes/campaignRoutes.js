import express from "express";

import {
  createCampaignInvite,
  getCampaignDetail,
} from "../controllers/campaignPublicController.js";
import {
  campaignAiUpload,
  generateCampaignFromImage,
} from "../controllers/campaignAiController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const appUserAuth = requireRoles(["influencer", "brand", "agency"]);
const ownerAuth = requireRoles(["brand", "agency"]);

// Must be registered before /:campaignId
router.post(
  "/ai/from-image",
  ownerAuth,
  campaignAiUpload.single("file"),
  generateCampaignFromImage
);

router.get("/:campaignId", appUserAuth, getCampaignDetail);
router.post("/:campaignId/invites", ownerAuth, createCampaignInvite);

export default router;
