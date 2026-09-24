import express from "express";
import { getAiRecommendationStatus, scanRecommendations, clearRecommendations } from '../controllers/communityAiController.js';

import {
  followCommunity,
  followCreator,
  getCommunity,
  getCreatorFollowStatus,
  joinCommunity,
  leaveCommunity,
  listCommunities,
  listCommunityMembers,
  listFollowingFeed,
  listNotifications,
  listSavedCampaigns,
  markAllNotificationsRead,
  markNotificationRead,
  saveCampaign,
  unfollowCommunity,
  unfollowCreator,
  unsaveCampaign,
} from "../controllers/engagementController.js";
import {
  registerDeviceToken,
  unregisterDeviceToken,
} from "../controllers/deviceTokenController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const influencerAuth = requireRoles(["influencer"]);
const appUserAuth = requireRoles(["influencer", "brand", "agency"]);

router.get("/communities", influencerAuth, listCommunities);
router.get('/communities/recommendations/scan', influencerAuth, getAiRecommendationStatus);
router.post('/communities/recommendations/scan', influencerAuth, scanRecommendations);
router.delete('/communities/recommendations/scan', influencerAuth, clearRecommendations);
router.get("/communities/:communityId", influencerAuth, getCommunity);
router.get(
  "/communities/:communityId/members",
  influencerAuth,
  listCommunityMembers
);
router.post("/communities/:communityId/join", influencerAuth, joinCommunity);
router.delete("/communities/:communityId/join", influencerAuth, leaveCommunity);
router.post("/communities/:communityId/follow", influencerAuth, followCommunity);
router.delete(
  "/communities/:communityId/follow",
  influencerAuth,
  unfollowCommunity
);

router.get("/influencer/following", influencerAuth, listFollowingFeed);
router.get(
  "/influencer/creators/:profileId/follow",
  influencerAuth,
  getCreatorFollowStatus
);
router.post(
  "/influencer/creators/:profileId/follow",
  influencerAuth,
  followCreator
);
router.delete(
  "/influencer/creators/:profileId/follow",
  influencerAuth,
  unfollowCreator
);

router.get("/influencer/saved-campaigns", influencerAuth, listSavedCampaigns);
router.post(
  "/influencer/saved-campaigns/:campaignId",
  influencerAuth,
  saveCampaign
);
router.delete(
  "/influencer/saved-campaigns/:campaignId",
  influencerAuth,
  unsaveCampaign
);

router.get("/notifications", appUserAuth, listNotifications);
router.post(
  "/notifications/read-all",
  appUserAuth,
  markAllNotificationsRead
);
router.post(
  "/notifications/:notificationId/read",
  appUserAuth,
  markNotificationRead
);

router.post("/notifications/device-token", appUserAuth, registerDeviceToken);
router.delete("/notifications/device-token", appUserAuth, unregisterDeviceToken);

export default router;
