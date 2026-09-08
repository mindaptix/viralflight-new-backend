import jwt from "jsonwebtoken";
import { Server } from "socket.io";

import {
  markConversationRead,
  sendMessage,
} from "../../application/chat/ChatService.js";

let io = null;
const onlineUsers = new Map(); // userId -> Set of socketIds

export const getChatIO = () => io;

export const isUserOnline = (userId) => {
  const sockets = onlineUsers.get(String(userId));
  return Boolean(sockets && sockets.size > 0);
};

export const initChatSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH", "DELETE"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // ─── Socket Authentication Middleware ────────────────────────────────────
  io.use((socket, next) => {
    try {
      const authHeader =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization ||
        socket.handshake.query?.token;

      if (!authHeader) {
        return next(new Error("Authentication token is required"));
      }

      const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : authHeader;

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error("Invalid or expired authentication token"));
    }
  });

  // ─── Connection Handler ──────────────────────────────────────────────────
  io.on("connection", (socket) => {
    const userId = String(socket.user.userId);
    const userRoom = `user:${userId}`;

    socket.join(userRoom);

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Broadcast presence if first socket connection for this user
    if (onlineUsers.get(userId).size === 1) {
      io.emit("user_presence", { userId, isOnline: true });
    }

    // ─── Join Conversation / Room ──────────────────────────────────────────
    const handleJoin = ({ conversationId, roomId }, callback) => {
      const targetId = conversationId || roomId;
      if (targetId) {
        const roomName = `conversation:${targetId}`;
        socket.join(roomName);
        if (typeof callback === "function") {
          callback({ success: true, room: roomName, conversationId: targetId });
        }
      }
    };
    socket.on("join_conversation", handleJoin);
    socket.on("join_room", handleJoin);

    // ─── Leave Conversation Room ───────────────────────────────────────────
    socket.on("leave_conversation", ({ conversationId, roomId }, callback) => {
      const targetId = conversationId || roomId;
      if (targetId) {
        const roomName = `conversation:${targetId}`;
        socket.leave(roomName);
        if (typeof callback === "function") {
          callback({ success: true, room: roomName, conversationId: targetId });
        }
      }
    });

    // ─── Real-Time Direct Message ──────────────────────────────────────────
    socket.on("send_message", async (payload, callback) => {
      try {
        const {
          conversationId,
          recipientId,
          text,
          content,
          mediaUrl,
          mediaType,
          type,
          metadata,
        } = payload || {};

        const messageText = text || content;
        const resolvedMediaType = mediaType || type;

        const result = await sendMessage({
          user: socket.user,
          conversationId,
          recipientId,
          text: messageText,
          mediaUrl,
          mediaType: resolvedMediaType,
          metadata,
        });

        const conversationRoom = `conversation:${result.conversationId}`;
        const recipientRoom = `user:${result.recipientId}`;

        const broadcastMessage = {
          ...result.message,
          content: result.message.text,
          type: result.message.media_type || type || "text",
          senderId: result.message.sender_id,
          recipientId: result.message.recipient_id,
          role: socket.user?.role || "influencer",
          timestamp: result.message.created_at,
        };

        // Emit to conversation room (so all active viewers in that chat receive it)
        io.to(conversationRoom).emit("new_message", {
          conversationId: result.conversationId,
          message: broadcastMessage,
        });

        // Also emit directly to recipient's personal room (for push/inbox/notification badge)
        io.to(recipientRoom).emit("new_message", {
          conversationId: result.conversationId,
          message: broadcastMessage,
        });

        if (typeof callback === "function") {
          callback({ success: true, data: broadcastMessage });
        }
      } catch (err) {
        if (typeof callback === "function") {
          callback({ success: false, error: err.message || "Failed to send message" });
        } else {
          socket.emit("chat_error", { message: err.message });
        }
      }
    });

    // ─── Typing Indicators ─────────────────────────────────────────────────
    socket.on("typing_start", ({ conversationId }) => {
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit("user_typing", {
          conversationId,
          userId,
          isTyping: true,
        });
      }
    });

    socket.on("typing_stop", ({ conversationId }) => {
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit("user_typing", {
          conversationId,
          userId,
          isTyping: false,
        });
      }
    });

    // ─── Mark As Read ──────────────────────────────────────────────────────
    socket.on("mark_as_read", async ({ conversationId }, callback) => {
      try {
        if (!conversationId) {
          if (typeof callback === "function") {
            return callback({ success: false, error: "conversationId is required" });
          }
          return;
        }

        const result = await markConversationRead({
          user: socket.user,
          conversationId,
        });

        // Notify other participants in the conversation
        io.to(`conversation:${conversationId}`).emit("messages_read", {
          conversationId,
          readBy: userId,
          readAt: result.read_at,
        });

        if (typeof callback === "function") {
          callback({ success: true, data: result });
        }
      } catch (err) {
        if (typeof callback === "function") {
          callback({ success: false, error: err.message });
        }
      }
    });

    // ─── Disconnect ────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit("user_presence", { userId, isOnline: false });
        }
      }
    });
  });

  return io;
};

export const emitDealStatusChanged = ({
  dealId,
  influencerUserId,
  brandUserId,
  status,
  deal,
  milestone,
}) => {
  if (!io) return;

  const payload = {
    dealId,
    status,
    timestamp: new Date().toISOString(),
    deal: deal
      ? typeof deal.toObject === "function"
        ? deal.toObject()
        : deal
      : null,
    milestone: milestone || null,
  };

  if (influencerUserId) {
    io.to(`user:${influencerUserId}`).emit("deal_status_changed", payload);
  }
  if (brandUserId) {
    io.to(`user:${brandUserId}`).emit("deal_status_changed", payload);
  }
  if (dealId) {
    io.to(`deal:${dealId}`).emit("deal_status_changed", payload);
  }
};

