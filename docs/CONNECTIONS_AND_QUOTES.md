# Connections + Quote Requests API

Replaces Flutter local-only `ConnectionsStore` with backend APIs.

Base URL: `https://viralflight.cloud`  
Auth: `Authorization: Bearer <JWT>`

---

## Connect (brand / agency → influencer)

| Method | Endpoint | Who |
|--------|----------|-----|
| POST | `/api/connections` | brand, agency |
| GET | `/api/connections` | brand, agency, influencer |
| GET | `/api/connections/:influencerProfileId/status` | brand, agency |
| DELETE | `/api/connections/:influencerProfileId` | brand, agency |

### Connect

```http
POST /api/connections
```

```json
{
  "influencerProfileId": "68f0....",
  "note": "optional note"
}
```

```json
{
  "success": true,
  "message": "Connected successfully",
  "connection": {
    "id": "...",
    "status": "connected",
    "isConnected": true,
    "influencerProfileId": "...",
    "influencer": { "id": "...", "name": "...", "profileImageUrl": "..." },
    "connectedAt": "..."
  }
}
```

### List

Brand/agency → their saved connections.  
Influencer → who connected to them.

### Status / disconnect

```http
GET /api/connections/:influencerProfileId/status
→ { "success": true, "isConnected": true, "connection": {...} }

DELETE /api/connections/:influencerProfileId
→ { "success": true, "message": "Disconnected successfully", "isConnected": false }
```

---

## Request quote

| Method | Endpoint | Who |
|--------|----------|-----|
| POST | `/api/quote-requests` | brand, agency |
| GET | `/api/quote-requests` | brand, agency, influencer |
| GET | `/api/quote-requests/:id` | owner sides |
| POST | `/api/quote-requests/:id/respond` | influencer |
| POST | `/api/quote-requests/:id/accept` | brand, agency |
| POST | `/api/quote-requests/:id/decline` | either side |
| POST | `/api/quote-requests/:id/withdraw` | brand, agency |

### Create quote request

```http
POST /api/quote-requests
```

```json
{
  "influencerProfileId": "68f0....",
  "message": "Need 2 Reels for Diwali campaign",
  "deliverables": ["reel", "story"],
  "budgetHint": 25000,
  "currency": "INR",
  "campaignId": "optional-campaign-id"
}
```

### Influencer responds

```http
POST /api/quote-requests/:id/respond
```

```json
{
  "quotedAmount": 30000,
  "currency": "INR",
  "note": "Includes edits",
  "validityDays": 14
}
```

Statuses: `pending` → `quoted` → `accepted` | `declined` | `withdrawn`

---

## Flutter migration notes

Replace `ConnectionsStore` local saves with:

1. On Connect tap → `POST /api/connections`
2. On screen load → `GET /api/connections`
3. Check button state → `GET /api/connections/:id/status`
4. Disconnect → `DELETE /api/connections/:id`

Replace local quote store with:

1. Request quote → `POST /api/quote-requests`
2. Inbox list → `GET /api/quote-requests`
3. Influencer quote → `POST /api/quote-requests/:id/respond`
