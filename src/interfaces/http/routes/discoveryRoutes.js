import express from "express";

import {
  searchAgenciesPublic,
  searchBrandsPublic,
  searchInfluencersPublic,
} from "../controllers/discoveryPublicController.js";
import {
  getPublicAgencyCampaigns,
  getPublicAgencyProfile,
  getPublicBrandCampaigns,
  getPublicBrandProfile,
} from "../controllers/publicOrgController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const appUserAuth = requireRoles(["influencer", "brand", "agency"]);

router.get("/influencers", appUserAuth, searchInfluencersPublic);
router.get("/brands", appUserAuth, searchBrandsPublic);
router.get("/brands/:brandProfileId/campaigns", appUserAuth, getPublicBrandCampaigns);
router.get("/brands/:brandProfileId", appUserAuth, getPublicBrandProfile);
router.get("/agencies", appUserAuth, searchAgenciesPublic);
router.get(
  "/agencies/:agencyProfileId/campaigns",
  appUserAuth,
  getPublicAgencyCampaigns
);
router.get("/agencies/:agencyProfileId", appUserAuth, getPublicAgencyProfile);

export default router;
