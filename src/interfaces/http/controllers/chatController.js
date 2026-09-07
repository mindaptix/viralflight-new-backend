import {
  getConversationMessages,
  getOrCreateConversation,
  listUserConversations,
  markConversationRead,
  sendMessage,
} from "../../../application/chat/ChatService.js";
import { getChatIO } from "../../../infrastructure/socket/chatSocket.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";

export const getOrCreateConversationController = asyncHandler(
  async (req, res) => {
    const result = await getOrCreateConversation({
      user: req.user,
      recipientId: req.body.recipient_id || req.body.recipientId,
    });
    sendSuccess(res, { statusCode: 201, ...result });
  }
);

export const listConversationsController = asyncHandler(async (req, res) => {
  const result = await listUserConversations({
    user: req.user,
    query: req.query,
  });
  sendSuccess(res, result);
});

export const getConversationMessagesController = asyncHandler(
  async (req, res) => {
    const result = await getConversationMessages({
      user: req.user,
      conversationId: req.params.conversationId,
      query: req.query,
    });
    sendSuccess(res, result);
  }
);

export const sendMessageController = asyncHandler(async (req, res) => {
  const result = await sendMessage({
    user: req.user,
    conversationId: req.params.conversationId || req.body.conversation_id || req.body.conversationId,
    recipientId: req.body.recipient_id || req.body.recipientId,
    text: req.body.text || req.body.message,
    mediaUrl: req.body.media_url || req.body.mediaUrl,
    mediaType: req.body.media_type || req.body.mediaType,
    metadata: req.body.metadata,
  });

  // Emit real-time socket event if IO initialized
  const io = getChatIO();
  if (io) {
    const conversationRoom = `conversation:${result.conversationId}`;
    const recipientRoom = `user:${result.recipientId}`;

    io.to(conversationRoom).emit("new_message", {
      conversationId: result.conversationId,
      message: result.message,
    });

    io.to(recipientRoom).emit("new_message", {
      conversationId: result.conversationId,
      message: result.message,
    });
  }

  sendSuccess(res, { statusCode: 201, data: result.message });
});

export const markConversationReadController = asyncHandler(async (req, res) => {
  const result = await markConversationRead({
    user: req.user,
    conversationId: req.params.conversationId,
  });

  const io = getChatIO();
  if (io) {
    io.to(`conversation:${req.params.conversationId}`).emit("messages_read", {
      conversationId: req.params.conversationId,
      readBy: String(req.user.userId),
      readAt: result.read_at,
    });
  }

  sendSuccess(res, result);
});
