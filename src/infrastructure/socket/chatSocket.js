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

    // ─── Join Conversation Room ────────────────────────────────────────────
    socket.on("join_conversation", ({ conversationId }, callback) => {
      if (conversationId) {
        const roomName = `conversation:${conversationId}`;
        socket.join(roomName);
        if (typeof callback === "function") {
          callback({ success: true, room: roomName, conversationId });
        }
      }
    });

    // ─── Leave Conversation Room ───────────────────────────────────────────
    socket.on("leave_conversation", ({ conversationId }, callback) => {
      if (conversationId) {
        const roomName = `conversation:${conversationId}`;
        socket.leave(roomName);
        if (typeof callback === "function") {
          callback({ success: true, room: roomName, conversationId });
        }
      }
    });

    // ─── Real-Time Direct Message ──────────────────────────────────────────
    socket.on("send_message", async (payload, callback) => {
      try {
        const { conversationId, recipientId, text, mediaUrl, mediaType, metadata } =
          payload || {};

        const result = await sendMessage({
          user: socket.user,
          conversationId,
          recipientId,
          text,
          mediaUrl,
          mediaType,
          metadata,
        });

        const conversationRoom = `conversation:${result.conversationId}`;
        const recipientRoom = `user:${result.recipientId}`;

        // Emit to conversation room (so all active viewers in that chat receive it)
        io.to(conversationRoom).emit("new_message", {
          conversationId: result.conversationId,
          message: result.message,
        });

        // Also emit directly to recipient's personal room (for push/inbox/notification badge)
        io.to(recipientRoom).emit("new_message", {
          conversationId: result.conversationId,
          message: result.message,
        });

        if (typeof callback === "function") {
          callback({ success: true, data: result.message });
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
