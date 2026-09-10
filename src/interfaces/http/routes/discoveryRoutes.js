import express from "express";

import {
  searchAgenciesPublic,
  searchBrandsPublic,
  searchInfluencersPublic,
} from "../controllers/discoveryPublicController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const appUserAuth = requireRoles(["influencer", "brand", "agency"]);

router.get("/influencers", appUserAuth, searchInfluencersPublic);
router.get("/brands", appUserAuth, searchBrandsPublic);
router.get("/agencies", appUserAuth, searchAgenciesPublic);

export default router;
