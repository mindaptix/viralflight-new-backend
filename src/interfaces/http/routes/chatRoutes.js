import express from "express";

import {
  getConversationMessagesController,
  getOrCreateConversationController,
  listConversationsController,
  markConversationReadController,
  sendMessageController,
} from "../controllers/chatController.js";
import { requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const appUserAuth = requireRoles(["influencer", "brand", "agency"]);

// ─── Chat Conversations ──────────────────────────────────────────────────────
router.post("/conversations", appUserAuth, getOrCreateConversationController);
router.get("/conversations", appUserAuth, listConversationsController);

// ─── Messages in Conversation ────────────────────────────────────────────────
router.get(
  "/conversations/:conversationId/messages",
  appUserAuth,
  getConversationMessagesController
);
router.post(
  "/conversations/:conversationId/messages",
  appUserAuth,
  sendMessageController
);
router.patch(
  "/conversations/:conversationId/read",
  appUserAuth,
  markConversationReadController
);

// Direct send message fallback
router.post("/messages", appUserAuth, sendMessageController);

export default router;
