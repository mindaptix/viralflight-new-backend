import express from "express";

import {
  listCollaborations,
  getCollaboration,
} from "../controllers/collaborationController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const appUserAuth = requireRoles(["influencer", "brand", "agency"]);

router.get("/", appUserAuth, listCollaborations);
router.get("/:collaborationId", appUserAuth, getCollaboration);

export default router;
