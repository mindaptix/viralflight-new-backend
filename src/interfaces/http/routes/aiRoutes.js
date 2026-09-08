import express from "express";

import {
  matchInfluencers,
  generateCampaignReport,
} from "../controllers/aiController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const appUserAuth = requireRoles(["brand", "agency", "influencer"]);

router.post("/match-influencers", appUserAuth, matchInfluencers);
router.post("/campaign-report", appUserAuth, generateCampaignReport);

export default router;
