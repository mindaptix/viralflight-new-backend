# Connections + Quote Requests API

Backend API endpoints to handle **Quote Requests** and **Connection Requests** between Brands/Agencies and Creators/Influencers in ViralFlight.

Base URL: `https://viralflight.cloud`  
Auth: `Authorization: Bearer <JWT>`

---

## 1. Create a Connection or Quote Request

Creates a new request from the authenticated brand or agency to a creator. Also automatically triggers an in-app notification to the target creator.

- **Method**: `POST`
- **Endpoint**: `/api/connections/requests`
- **Roles**: `brand`, `agency`

### Request Headers
```http
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body
```json
{
  "creator_id": "68f0abc12345678901234567",
  "kind": "quote", // Allowed: "quote" | "connection"
  "brand_name": "Acme Fitness", // Optional, defaults to brand/agency profile name
  "brand_niche": "Fitness & Wellness", // Optional, defaults to brand/agency niche
  "message": "Please share your quote for a paid collaboration.",
  "budget_display": "$500 - $1,000", // Optional (e.g., "$500 - $1,000" or "To discuss")
  "deliverable": "1 Reel + 2 Stories", // Optional (e.g., "Reel / Story")
  "city": "Mumbai" // Optional, defaults to creator profile city
}
```

### Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "id": "68f0def98765432109876543",
    "kind": "quote",
    "status": "pending",
    "creator_id": "68f0abc12345678901234567",
    "brand_id": "68f011122233344455566677",
    "brand_name": "Acme Fitness",
    "brand_niche": "Fitness & Wellness",
    "message": "Please share your quote for a paid collaboration.",
    "budget_display": "$500 - $1,000",
    "deliverable": "1 Reel + 2 Stories",
    "city": "Mumbai",
    "created_at": "2026-09-07T12:30:00.000Z"
  }
}
```

---

## 2. Fetch User's Requests / Inbox

Fetch all connection and quote requests (for creators to view incoming requests, or brands/agencies to view outgoing requests).

- **Method**: `GET`
- **Endpoint**: `/api/connections` (or `/api/connections/requests`)
- **Roles**: `influencer`, `brand`, `agency`

### Query Parameters
- `type` / `kind` (optional): `all` | `quotes` | `connections`
- `status` (optional): `pending` | `accepted` | `declined` | `disconnected`
- `page` (optional, default: `1`): page number
- `limit` (optional, default: `20`): items per page

### Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "68f0def98765432109876543",
      "kind": "quote",
      "status": "pending",
      "is_incoming": true,
      "creator_id": "68f0abc12345678901234567",
      "brand_id": "68f011122233344455566677",
      "brand_name": "Acme Fitness",
      "brand_niche": "Fitness & Wellness",
      "message": "Please share your quote for a paid collaboration.",
      "budget_display": "$500 - $1,000",
      "deliverable": "1 Reel + 2 Stories",
      "city": "Mumbai",
      "created_at": "2026-09-07T12:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

---

## 3. Update Request Status

Allows creators or brands to accept, decline, or disconnect requests. Triggers in-app notifications to the opposite party.

- **Method**: `PATCH`
- **Endpoint**: `/api/connections/:id/status` (or `/api/connections/requests/:id/status`)
- **Roles**: `influencer`, `brand`, `agency`

### Request Body
```json
{
  "status": "accepted" // Allowed values: "accepted" | "declined" | "disconnected"
}
```

### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Request status updated to accepted",
  "data": {
    "id": "68f0def98765432109876543",
    "status": "accepted",
    "updated_at": "2026-09-07T12:35:00.000Z"
  }
}
```

---

## 4. Get Request by ID

- **Method**: `GET`
- **Endpoint**: `/api/connections/requests/:id` (or `/api/connections/:id`)
- **Roles**: Owner of request (`creator` or `brand` / `agency`)

### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "id": "68f0def98765432109876543",
    "kind": "quote",
    "status": "accepted",
    "is_incoming": true,
    "creator_id": "68f0abc12345678901234567",
    "brand_id": "68f011122233344455566677",
    "brand_name": "Acme Fitness",
    "brand_niche": "Fitness & Wellness",
    "message": "Please share your quote for a paid collaboration.",
    "budget_display": "$500 - $1,000",
    "deliverable": "1 Reel + 2 Stories",
    "city": "Mumbai",
    "created_at": "2026-09-07T12:30:00.000Z"
  }
}
```
