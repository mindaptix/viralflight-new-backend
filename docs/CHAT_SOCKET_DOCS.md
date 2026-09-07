# Real-Time 1-on-1 Chat Socket & REST API Documentation

ViralFlight provides real-time bi-directional 1-on-1 chat using **Socket.IO** (with WebSocket / polling transports) paired with persistent **MongoDB** message storage and **REST APIs** for message history and conversation management.

---

## ⚡ Chat Lifecycle & Auto-Initiation on Campaign Acceptance

Chat conversations between Brands/Agencies and Influencers are automatically initialized in the following business workflows:

1. **Campaign Application Acceptance**: When a brand/agency accepts an influencer's campaign application (`PATCH /api/campaign-applications/:applicationId`), a dedicated conversation linked with `campaign_id` and `campaign_title` is immediately created and an initial welcome message is posted, enabling real-time chat between both parties.
2. **Connection / Quote Request Acceptance**: When a connection or quote request status is updated to `accepted` (`PATCH /api/connections/:id/status`), a direct chat conversation is automatically started and live socket events are dispatched to both user rooms.

---

## 1. Socket.IO Connection & Authentication

### Connection URL
- **Production**: `wss://viralflight-new-backend.onrender.com` (or `https://...`)
- **Local Dev**: `http://localhost:5000`

### Client Authentication (Handshake)
Clients must authenticate by providing a valid JWT Bearer token in the handshake `auth` object, `headers`, or query parameter.

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: {
    token: "Bearer <YOUR_JWT_ACCESS_TOKEN>"
  },
  transports: ["websocket", "polling"]
});

socket.on("connect", () => {
  console.log("Connected to chat socket. Socket ID:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("Socket authentication failed:", err.message);
});
```

---

## 2. Real-Time Socket Events

### 🔹 Client Emitted Events (Client → Server)

| Event Name | Payload | Description | Callback Response |
|------------|---------|-------------|-------------------|
| `join_conversation` | `{ conversationId: "conv_123" }` | Join the active conversation room to receive live messages & typing events. | `{ success: true, room, conversationId }` |
| `leave_conversation`| `{ conversationId: "conv_123" }` | Leave the conversation room. | `{ success: true }` |
| `send_message` | `{ conversationId?, recipientId?, text, mediaUrl?, mediaType?, metadata? }` | Send a 1-on-1 message in real-time. | `{ success: true, data: messageObject }` |
| `typing_start` | `{ conversationId: "conv_123" }` | Notify other participant that user is typing. | — |
| `typing_stop` | `{ conversationId: "conv_123" }` | Notify other participant that user stopped typing. | — |
| `mark_as_read` | `{ conversationId: "conv_123" }` | Mark all unread incoming messages in conversation as read. | `{ success: true, data: { read_at } }` |

#### Example: Send Message via Socket
```javascript
socket.emit("send_message", {
  recipientId: "68f0abc12345678901234567",
  conversationId: "68f0def98765432109876543", // optional if recipientId is provided
  text: "Hey! Let's discuss the deliverables for the campaign.",
  mediaUrl: null,
  mediaType: null
}, (response) => {
  if (response.success) {
    console.log("Message delivered:", response.data);
  } else {
    console.error("Message send error:", response.error);
  }
});
```

---

### 🔹 Server Emitted Events (Server → Client)

| Event Name | Payload | Description |
|------------|---------|-------------|
| `new_message` | `{ conversationId, message: {...} }` | Emitted to both participants when a new message arrives. |
| `user_typing` | `{ conversationId, userId, isTyping: true/false }` | Emitted when the other participant starts/stops typing. |
| `messages_read` | `{ conversationId, readBy, readAt }` | Emitted when messages have been marked as read. |
| `user_presence` | `{ userId, isOnline: true/false }` | Emitted on global connection / disconnection for online indicators. |
| `chat_error` | `{ message }` | Emitted on server errors when no callback is supplied. |

#### Example: Listening for Incoming Messages
```javascript
socket.on("new_message", ({ conversationId, message }) => {
  console.log("New message received in conversation:", conversationId, message);
  // message: { id, conversation_id, sender_id, recipient_id, text, is_read, created_at, ... }
});
```

#### Example: Listening for Typing Indicator
```javascript
socket.on("user_typing", ({ conversationId, userId, isTyping }) => {
  if (isTyping) {
    showTypingIndicator(userId);
  } else {
    hideTypingIndicator(userId);
  }
});
```

---

## 3. REST API Endpoints

Headers for all REST endpoints:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
```

### 1. `POST /api/chat/conversations` (Get or Create 1-on-1 Conversation)
**Request Body:**
```json
{
  "recipient_id": "68f0abc12345678901234567"
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "conversation": {
    "id": "68f0def98765432109876543",
    "participants": ["68f011122233344455566677", "68f0abc12345678901234567"],
    "recipient": {
      "userId": "68f0abc12345678901234567",
      "name": "Aman Sharma",
      "profileImageUrl": "https://...",
      "role": "influencer"
    },
    "last_message": "Hey there!",
    "last_message_at": "2026-09-07T14:00:00.000Z",
    "unread_count": 0,
    "created_at": "2026-09-07T12:00:00.000Z"
  }
}
```

### 2. `GET /api/chat/conversations` (List User's Conversations)
**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "68f0def98765432109876543",
      "participants": ["68f011122233344455566677", "68f0abc12345678901234567"],
      "recipient": {
        "userId": "68f0abc12345678901234567",
        "name": "Aman Sharma",
        "role": "influencer"
      },
      "last_message": "Looking forward to working together!",
      "last_message_at": "2026-09-07T14:10:00.000Z",
      "unread_count": 2,
      "created_at": "2026-09-07T12:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

### 3. `GET /api/chat/conversations/:conversationId/messages` (Message History)
**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "msg_001",
      "conversation_id": "68f0def98765432109876543",
      "sender_id": "68f011122233344455566677",
      "recipient_id": "68f0abc12345678901234567",
      "text": "Hello, when can you deliver the first draft?",
      "media_url": null,
      "is_read": true,
      "read_at": "2026-09-07T14:05:00.000Z",
      "created_at": "2026-09-07T14:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 50
  }
}
```

### 4. `POST /api/chat/conversations/:conversationId/messages` (Send Message via REST)
**Request Body:**
```json
{
  "text": "Draft will be shared by tomorrow noon!",
  "media_url": null
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "msg_002",
    "conversation_id": "68f0def98765432109876543",
    "sender_id": "68f0abc12345678901234567",
    "recipient_id": "68f011122233344455566677",
    "text": "Draft will be shared by tomorrow noon!",
    "media_url": null,
    "is_read": false,
    "read_at": null,
    "created_at": "2026-09-07T14:15:00.000Z"
  }
}
```

### 5. `PATCH /api/chat/conversations/:conversationId/read` (Mark Conversation as Read)
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Conversation marked as read",
  "conversation_id": "68f0def98765432109876543",
  "read_at": "2026-09-07T14:16:00.000Z"
}
```
