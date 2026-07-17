import express from "express";

import { requireRoles } from "../middleware/authMiddleware.js";
import { updateApplicationStatusController } from "../controllers/campaignApplicationController.js";

const router = express.Router();
const ownerAuth = requireRoles(["brand", "agency"]);

router.patch(
  "/:applicationId",
  ownerAuth,
  updateApplicationStatusController
);

export default router;
