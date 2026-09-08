import express from "express";

import {
  getMyProfile,
  getOnboardingOptions,
  saveFullOnboarding,
} from "../controllers/agencyController.js";
import { deleteAccount, logout } from "../controllers/authController.js";
import {
  createAgencyCampaignController,
  listAgencyCampaigns,
} from "../controllers/campaignController.js";
import { listCampaignApplicationsController } from "../controllers/campaignApplicationController.js";
import { listAgencyInfluencers } from "../controllers/discoveryController.js";
import { getAgencyDashboard } from "../controllers/publicOrgController.js";
import {
  getAgencyDashboardStats,
  getTalentRoster,
  addTalentToRoster,
  removeTalentFromRoster,
  getAgencyDeals,
  getAgencyNegotiations,
  getAgencyHq,
} from "../controllers/agencyFeatureSuiteController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const agencyAuth = requireRoles(["agency"]);

// ─── Onboarding & Profile ────────────────────────────────────────────────────
router.get("/onboarding-options", agencyAuth, getOnboardingOptions);
router.get("/profile", agencyAuth, getMyProfile);
router.post("/full-onboarding", agencyAuth, saveFullOnboarding);

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get("/dashboard", agencyAuth, getAgencyDashboard);
router.get("/dashboard-stats", agencyAuth, getAgencyDashboardStats);

// ─── Talent Roster ────────────────────────────────────────────────────────────
router.get("/talent", agencyAuth, getTalentRoster);
router.post("/talent", agencyAuth, addTalentToRoster);
router.delete("/talent/:talentId", agencyAuth, removeTalentFromRoster);

// ─── Deals & Negotiations ─────────────────────────────────────────────────────
router.get("/deals", agencyAuth, getAgencyDeals);
router.get("/negotiations", agencyAuth, getAgencyNegotiations);

// ─── Agency HQ ────────────────────────────────────────────────────────────────
router.get("/hq", agencyAuth, getAgencyHq);

// ─── Campaigns ────────────────────────────────────────────────────────────────
router.get("/campaigns", agencyAuth, listAgencyCampaigns);
router.post("/campaigns", agencyAuth, createAgencyCampaignController);
router.get(
  "/campaigns/:campaignId/applications",
  agencyAuth,
  listCampaignApplicationsController
);

// ─── Discovery ────────────────────────────────────────────────────────────────
router.get("/influencers", agencyAuth, listAgencyInfluencers);

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post("/logout", agencyAuth, logout);
router.delete("/account", agencyAuth, deleteAccount);

export default router;
