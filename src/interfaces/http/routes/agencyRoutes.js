import express from "express";

import {
  getMyProfile,
  getOnboardingOptions,
  saveFullOnboarding,
} from "../controllers/agencyController.js";
import { logout } from "../controllers/authController.js";
import {
  createAgencyCampaignController,
  listAgencyCampaigns,
} from "../controllers/campaignController.js";
import { deleteAgencyCampaign } from "../controllers/agencyCampaignController.js";
import { listCampaignApplicationsController } from "../controllers/campaignApplicationController.js";
import { listAgencyInfluencers } from "../controllers/discoveryController.js";
import { requireRoles } from "../middleware/authMiddleware.js";
import {
  getAgencyDashboardStats,
  getTalentRoster,
  addTalentToRoster,
  removeTalentFromRoster,
  getAgencyCampaignInvites,
  cancelAgencyCampaignInvite,
} from "../controllers/agencyFeatureSuiteController.js";

const router = express.Router();
const agencyAuth = requireRoles(["agency"]);

router.get("/onboarding-options", agencyAuth, getOnboardingOptions);
router.get("/profile", agencyAuth, getMyProfile);
router.get("/dashboard-stats", agencyAuth, getAgencyDashboardStats);
router.get("/talent", agencyAuth, getTalentRoster);
router.post("/talent", agencyAuth, addTalentToRoster);
router.delete("/talent/:talentId", agencyAuth, removeTalentFromRoster);
router.get("/campaign-invites", agencyAuth, getAgencyCampaignInvites);
router.delete("/campaign-invites/:inviteId", agencyAuth, cancelAgencyCampaignInvite);
router.get("/campaigns", agencyAuth, listAgencyCampaigns);
router.get(
  "/campaigns/:campaignId/applications",
  agencyAuth,
  listCampaignApplicationsController
);
router.get("/influencers", agencyAuth, listAgencyInfluencers);
router.post("/full-onboarding", agencyAuth, saveFullOnboarding);
router.post("/campaigns", agencyAuth, createAgencyCampaignController);
router.delete("/campaigns/:campaignId", agencyAuth, deleteAgencyCampaign);
router.post("/logout", agencyAuth, logout);

export default router;
