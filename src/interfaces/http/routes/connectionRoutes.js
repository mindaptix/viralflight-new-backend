import express from "express";

import {
  createConnection,
  deleteConnection,
  getConnectionByProfile,
  getConnections,
} from "../controllers/connectionController.js";
import {
  acceptQuoteRequestController,
  createQuoteRequestController,
  declineQuoteRequestController,
  getQuoteRequestController,
  listQuoteRequestsController,
  respondQuoteRequestController,
  withdrawQuoteRequestController,
} from "../controllers/quoteRequestController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const brandAgencyAuth = requireRoles(["brand", "agency"]);
const appUserAuth = requireRoles(["influencer", "brand", "agency"]);
const influencerAuth = requireRoles(["influencer"]);

// ─── Connections (replaces Flutter ConnectionsStore) ─────────────────────────
router.post("/connections", brandAgencyAuth, createConnection);
router.get("/connections", appUserAuth, getConnections);
router.get(
  "/connections/:influencerProfileId/status",
  brandAgencyAuth,
  getConnectionByProfile
);
router.delete(
  "/connections/:influencerProfileId",
  brandAgencyAuth,
  deleteConnection
);

// ─── Quote requests (replaces Flutter local quote store) ─────────────────────
router.post("/quote-requests", brandAgencyAuth, createQuoteRequestController);
router.get("/quote-requests", appUserAuth, listQuoteRequestsController);
router.get(
  "/quote-requests/:quoteRequestId",
  appUserAuth,
  getQuoteRequestController
);
router.post(
  "/quote-requests/:quoteRequestId/respond",
  influencerAuth,
  respondQuoteRequestController
);
router.post(
  "/quote-requests/:quoteRequestId/accept",
  brandAgencyAuth,
  acceptQuoteRequestController
);
router.post(
  "/quote-requests/:quoteRequestId/decline",
  appUserAuth,
  declineQuoteRequestController
);
router.post(
  "/quote-requests/:quoteRequestId/withdraw",
  brandAgencyAuth,
  withdrawQuoteRequestController
);

export default router;
