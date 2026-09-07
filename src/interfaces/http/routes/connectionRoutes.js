import express from "express";

import {
  createConnection,
  deleteConnection,
  getConnectionByProfile,
  getConnections,
} from "../controllers/connectionController.js";
import {
  createConnectionRequestController,
  getConnectionRequestByIdController,
  listConnectionRequestsController,
  updateConnectionRequestStatusController,
} from "../controllers/connectionRequestController.js";
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

// ─── Quote & Connection Requests API (New Standard) ──────────────────────────
router.post(
  "/connections/requests",
  brandAgencyAuth,
  createConnectionRequestController
);
router.get(
  "/connections/requests",
  appUserAuth,
  listConnectionRequestsController
);
router.get(
  "/connections/requests/:id",
  appUserAuth,
  getConnectionRequestByIdController
);
router.patch(
  "/connections/requests/:id/status",
  appUserAuth,
  updateConnectionRequestStatusController
);

// ─── Unified Connections Inbox & Status ──────────────────────────────────────
router.get("/connections", appUserAuth, listConnectionRequestsController);
router.patch(
  "/connections/:id/status",
  appUserAuth,
  updateConnectionRequestStatusController
);

// ─── Legacy Connections (Profile Connection Store) ───────────────────────────
router.post("/connections", brandAgencyAuth, createConnection);
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
router.get(
  "/connections/:id",
  appUserAuth,
  getConnectionRequestByIdController
);

// ─── Legacy Quote Requests Endpoints ─────────────────────────────────────────
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
