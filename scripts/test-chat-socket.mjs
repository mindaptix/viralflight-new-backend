import assert from "assert";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { io as ClientIO } from "socket.io-client";

import ChatMessage from "../src/models/ChatMessage.js";
import Conversation from "../src/models/Conversation.js";
import InfluencerProfile from "../src/models/InfluencerProfile.js";
import BrandProfile from "../src/models/BrandProfile.js";
import User from "../src/models/User.js";
import chatRoutes from "../src/interfaces/http/routes/chatRoutes.js";
import { initChatSocket } from "../src/infrastructure/socket/chatSocket.js";

async function runChatSocketTests() {
  console.log("Starting Real-Time Chat Socket Test Suite...\n");

  const JWT_SECRET = process.env.JWT_SECRET || "local_dev_jwt_secret";
  process.env.JWT_SECRET = JWT_SECRET;

  const userAId = new mongoose.Types.ObjectId();
  const userBId = new mongoose.Types.ObjectId();
  const convId = new mongoose.Types.ObjectId();

  const userA = { userId: userAId, role: "brand", mobile: "+919800000001" };
  const userB = { userId: userBId, role: "influencer", mobile: "+919800000002" };

  const tokenA = jwt.sign(userA, JWT_SECRET, { expiresIn: "1h" });
  const tokenB = jwt.sign(userB, JWT_SECRET, { expiresIn: "1h" });

  // In-memory mock store
  let mockConversations = [
    {
      _id: convId,
      participants: [userAId, userBId],
      lastMessage: { text: "Initial msg", senderId: userAId, createdAt: new Date() },
      lastMessageAt: new Date(),
      unreadCounts: new Map([[String(userAId), 0], [String(userBId), 0]]),
      createdAt: new Date(),
      updatedAt: new Date(),
      save: async function () { return this; }
    }
  ];
  let mockMessages = [];

  // Mock Models
  User.findById = async (id) => {
    if (String(id) === String(userAId)) return { _id: userAId, role: "brand", mobile: userA.mobile };
    if (String(id) === String(userBId)) return { _id: userBId, role: "influencer", mobile: userB.mobile };
    return null;
  };

  InfluencerProfile.findOne = async () => ({
    userId: userBId,
    name: "Creator Priya",
    city: "Mumbai",
  });

  BrandProfile.findOne = async () => ({
    userId: userAId,
    brandName: "Acme Activewear",
    industry: "Fashion",
  });

  Conversation.findOne = async (query) => {
    return mockConversations[0];
  };
  Conversation.findById = async (id) => {
    return mockConversations[0];
  };
  Conversation.create = async (doc) => {
    const c = {
      ...doc,
      _id: convId,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: async function () { return this; }
    };
    return c;
  };
  Conversation.find = () => ({
    sort: () => ({
      skip: () => ({
        limit: () => ({
          lean: async () => mockConversations
        })
      })
    })
  });
  Conversation.countDocuments = async () => mockConversations.length;

  ChatMessage.create = async (doc) => {
    const msg = {
      ...doc,
      _id: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      save: async function () { return this; }
    };
    mockMessages.push(msg);
    return msg;
  };
  ChatMessage.find = () => ({
    sort: () => ({
      skip: () => ({
        limit: () => ({
          lean: async () => mockMessages
        })
      })
    })
  });
  ChatMessage.countDocuments = async () => mockMessages.length;
  ChatMessage.updateMany = async (query, update) => {
    mockMessages.forEach(m => { m.isRead = true; m.readAt = new Date(); });
    return { modifiedCount: 1 };
  };

  // Set up Express test app and HTTP server
  const app = express();
  app.use(express.json());
  app.use("/api/chat", chatRoutes);

  const server = http.createServer(app);
  initChatSocket(server);

  const PORT = 5588;
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`✓ Test Socket Server running on port ${PORT}`);

  try {
    // ─── TEST 1: Connect Two Sockets with JWT Auth ───────────────────────────
    console.log("\nTEST 1: Authenticate and Connect Sockets for User A and User B");
    const socketA = ClientIO(`http://localhost:${PORT}`, {
      auth: { token: `Bearer ${tokenA}` },
      transports: ["websocket"],
    });

    const socketB = ClientIO(`http://localhost:${PORT}`, {
      auth: { token: `Bearer ${tokenB}` },
      transports: ["websocket"],
    });

    await Promise.all([
      new Promise((resolve, reject) => {
        socketA.on("connect", resolve);
        socketA.on("connect_error", reject);
      }),
      new Promise((resolve, reject) => {
        socketB.on("connect", resolve);
        socketB.on("connect_error", reject);
      }),
    ]);

    assert(socketA.connected, "Socket A should be connected");
    assert(socketB.connected, "Socket B should be connected");
    console.log("✓ Socket A (Brand) & Socket B (Creator) authenticated and connected");

    // ─── TEST 2: Join Conversation Room ──────────────────────────────────────
    console.log("\nTEST 2: Join Conversation Room");
    await new Promise((resolve) => {
      socketA.emit("join_conversation", { conversationId: String(convId) }, (res) => {
        assert(res.success, "Socket A join conversation failed");
        resolve();
      });
    });

    await new Promise((resolve) => {
      socketB.emit("join_conversation", { conversationId: String(convId) }, (res) => {
        assert(res.success, "Socket B join conversation failed");
        resolve();
      });
    });
    console.log("✓ Both sockets joined conversation room");

    // ─── TEST 3: Real-Time Send & Receive Direct Message ─────────────────────
    console.log("\nTEST 3: Real-Time Send & Receive 1-on-1 Message");
    const messageReceivedPromise = new Promise((resolve) => {
      socketB.on("new_message", (data) => {
        resolve(data);
      });
    });

    const sendAck = await new Promise((resolve) => {
      socketA.emit(
        "send_message",
        {
          conversationId: String(convId),
          recipientId: String(userBId),
          text: "Hi Priya! We love your work and want to collaborate.",
        },
        resolve
      );
    });

    assert(sendAck.success, "Message sending acknowledgement failed");
    assert.strictEqual(sendAck.data.text, "Hi Priya! We love your work and want to collaborate.");
    assert.strictEqual(sendAck.data.sender_id, String(userAId));
    assert.strictEqual(sendAck.data.recipient_id, String(userBId));

    const receivedMessageEvent = await messageReceivedPromise;
    assert.strictEqual(receivedMessageEvent.conversationId, String(convId));
    assert.strictEqual(receivedMessageEvent.message.text, "Hi Priya! We love your work and want to collaborate.");
    console.log("✓ Real-time message successfully sent by User A and received by User B");

    // ─── TEST 4: Typing Indicator Events ─────────────────────────────────────
    console.log("\nTEST 4: Typing Indicator Start & Stop Events");
    const typingPromise = new Promise((resolve) => {
      socketA.on("user_typing", (data) => {
        resolve(data);
      });
    });

    socketB.emit("typing_start", { conversationId: String(convId) });
    const typingEvent = await typingPromise;
    assert.strictEqual(typingEvent.conversationId, String(convId));
    assert.strictEqual(typingEvent.userId, String(userBId));
    assert.strictEqual(typingEvent.isTyping, true);
    console.log("✓ Typing start event received in real-time");

    // ─── TEST 5: Mark as Read & Read Receipts ────────────────────────────────
    console.log("\nTEST 5: Mark Messages Read & Broadcast Receipt");
    const readReceiptPromise = new Promise((resolve) => {
      socketA.on("messages_read", (data) => {
        resolve(data);
      });
    });

    const readAck = await new Promise((resolve) => {
      socketB.emit("mark_as_read", { conversationId: String(convId) }, resolve);
    });

    assert(readAck.success, "Mark as read failed");
    const readReceipt = await readReceiptPromise;
    assert.strictEqual(readReceipt.conversationId, String(convId));
    assert.strictEqual(readReceipt.readBy, String(userBId));
    assert(readReceipt.readAt, "readAt should be present");
    console.log("✓ Read receipt successfully broadcast to User A");

    // ─── Clean up sockets ───────────────────────────────────────────────────
    socketA.disconnect();
    socketB.disconnect();

    console.log("\n==================================================");
    console.log("🎉 ALL REAL-TIME CHAT SOCKET TESTS PASSED! 🎉");
    console.log("==================================================");

  } finally {
    server.close();
  }
}

runChatSocketTests().catch((err) => {
  console.error("Chat socket test failed:", err);
  process.exit(1);
});
