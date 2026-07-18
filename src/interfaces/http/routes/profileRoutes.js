import express from "express";

import { requireRoles } from "../middleware/authMiddleware.js";
import { getPublicCreatorProfile } from "../controllers/publicProfileController.js";

const router = express.Router();
const anyAuth = requireRoles(["influencer", "brand", "agency"]);

router.get("/:profileId", anyAuth, getPublicCreatorProfile);

export default router;
