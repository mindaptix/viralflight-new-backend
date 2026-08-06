import express from "express";

import { requireRoles } from "../middleware/authMiddleware.js";
import { getPublicCreatorProfile } from "../controllers/publicProfileController.js";
import {
  getMyRoleProfile,
  patchMyRoleProfile,
} from "../controllers/meProfileController.js";

const router = express.Router();
const anyAuth = requireRoles(["influencer", "brand", "agency"]);

router.get("/me", anyAuth, getMyRoleProfile);
router.patch("/me", anyAuth, patchMyRoleProfile);
router.get("/:profileId", anyAuth, getPublicCreatorProfile);

export default router;
