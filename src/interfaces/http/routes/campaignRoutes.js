import express from "express";

import {
  createCampaignInvite,
  getCampaignDetail,
} from "../controllers/campaignPublicController.js";
<<<<<<< HEAD
import {
  campaignAiUpload,
  generateCampaignFromImage,
} from "../controllers/campaignAiController.js";
import { listPublicCampaigns } from "../controllers/campaignController.js";
=======
>>>>>>> 542fda10a598293e5d98e294bf7584fb0afbb8bc
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const appUserAuth = requireRoles(["influencer", "brand", "agency"]);
const ownerAuth = requireRoles(["brand", "agency"]);

<<<<<<< HEAD
// Campaign Marketplace — must be registered before /:campaignId
router.get("/", appUserAuth, listPublicCampaigns);

// AI Campaign Creation — must be registered before /:campaignId
router.post(
  "/ai/from-image",
  ownerAuth,
  campaignAiUpload.single("file"),
  generateCampaignFromImage
);

=======
>>>>>>> 542fda10a598293e5d98e294bf7584fb0afbb8bc
router.get("/:campaignId", appUserAuth, getCampaignDetail);
router.post("/:campaignId/invites", ownerAuth, createCampaignInvite);

export default router;

