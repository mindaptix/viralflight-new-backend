import express from "express";

import {
  getMyProfile,
  getOnboardingOptions,
  saveFullOnboarding,
} from "../controllers/brandController.js";
import { logout } from "../controllers/authController.js";
import {
  createCampaign,
  listBrandCampaigns,
} from "../controllers/campaignController.js";
import {
  saveExtendedBrandOnboarding,
  verifyGst,
  saveBrandKit,
  verifyBankAccount,
  saveEscrowConfig,
  getBrandDashboardStats,
  getEscrowSummary,
  getCampaignAnalytics,
  updateBrandCampaign,
  deleteBrandCampaign,
} from "../controllers/brandFeatureSuiteController.js";
import { listCampaignApplicationsController } from "../controllers/campaignApplicationController.js";
import { listBrandCreators } from "../controllers/discoveryController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const brandAuth = requireRoles(["brand"]);

// ─── Onboarding & Profile ────────────────────────────────────────────────────
router.get("/onboarding-options", brandAuth, getOnboardingOptions);
router.get("/profile", brandAuth, getMyProfile);
router.post("/full-onboarding", brandAuth, saveFullOnboarding);

// ─── Step 1: Identity & Tax ───────────────────────────────────────────────────
router.post("/verify-gst", brandAuth, verifyGst);

// ─── Step 2: Brand Kit ────────────────────────────────────────────────────────
router.put("/brand-kit", brandAuth, saveBrandKit);

// ─── Step 3: Escrow & Payout Vault ───────────────────────────────────────────
router.post("/verify-bank-account", brandAuth, verifyBankAccount);
router.put("/escrow-config", brandAuth, saveEscrowConfig);

// ─── Brand Dashboard Stats & Analytics ───────────────────────────────────────
router.get("/dashboard-stats", brandAuth, getBrandDashboardStats);
router.get("/escrow-summary", brandAuth, getEscrowSummary);

// ─── Campaign CRUD ────────────────────────────────────────────────────────────
router.get("/campaigns", brandAuth, listBrandCampaigns);
router.post("/campaigns", brandAuth, createCampaign);
router.put("/campaigns/:campaignId", brandAuth, updateBrandCampaign);
router.delete("/campaigns/:campaignId", brandAuth, deleteBrandCampaign);
router.get(
  "/campaigns/:campaignId/applications",
  brandAuth,
  listCampaignApplicationsController
);
router.get(
  "/campaigns/:campaignId/analytics",
  brandAuth,
  getCampaignAnalytics
);

// ─── Discovery ────────────────────────────────────────────────────────────────
router.get("/creators", brandAuth, listBrandCreators);

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post("/logout", brandAuth, logout);

export default router;
