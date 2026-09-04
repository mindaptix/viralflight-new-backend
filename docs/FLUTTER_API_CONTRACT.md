# Viral Flight — Flutter API Contract

Base URL: `https://viralflight.cloud`  
Auth header: `Authorization: Bearer <accessToken>`

---

## Field name cheat-sheet (campaigns)

| Flutter / UI meaning | Backend field |
|----------------------|---------------|
| Influencer to connect / quote | `influencerProfileId` (InfluencerProfile `_id`) |
| Brand details page id | `brandProfileId` (= BrandProfile `_id`) |
| Agency details page id | `agencyProfileId` (= AgencyProfile `_id`) |
| Campaign owner profile | `ownerProfileId` + `ownerRole` (`brand` \| `agency`) |
| Brand on campaign | `brandProfileId`, `brandUserId`, `brandName` |
| Agency on campaign | `agencyProfileId`, `agencyUserId`, `agencyName` |
| **No** bare `brandId` field | Use `brandProfileId` or `ownerProfileId` |

Aliases returned on public brand/agency DTOs: `id`, `profileId`, `brandId` / `agencyId`, `ownerProfileId`.

---

## 1. Quote requests — LIVE

| Method | Path | Role |
|--------|------|------|
| POST | `/api/quote-requests` | brand, agency |
| GET | `/api/quote-requests` | influencer, brand, agency |
| GET | `/api/quote-requests/:quoteRequestId` | parties |
| POST | `/api/quote-requests/:id/respond` | influencer |
| POST | `/api/quote-requests/:id/accept` | brand, agency |
| POST | `/api/quote-requests/:id/decline` | either |
| POST | `/api/quote-requests/:id/withdraw` | brand, agency |

### Create

```http
POST /api/quote-requests
```

```json
{
  "influencerProfileId": "68f0abcd...",
  "message": "Need 2 Reels for Diwali",
  "deliverables": ["reel", "story"],
  "budgetHint": 25000,
  "currency": "INR",
  "campaignId": "optional"
}
```

```json
{
  "success": true,
  "message": "Quote request sent",
  "quoteRequest": {
    "id": "...",
    "status": "pending",
    "influencerProfileId": "...",
    "message": "Need 2 Reels for Diwali",
    "deliverables": ["reel", "story"],
    "budgetHint": 25000,
    "currency": "INR",
    "quotedAmount": null,
    "influencer": { "id": "...", "name": "...", "profileImageUrl": "..." }
  }
}
```

### Influencer respond

```json
{ "quotedAmount": 30000, "currency": "INR", "note": "Includes edits", "validityDays": 14 }
```

Statuses: `pending` → `quoted` → `accepted` | `declined` | `withdrawn`

---

## 2. Connections — LIVE

| Method | Path | Role |
|--------|------|------|
| POST | `/api/connections` | brand, agency |
| GET | `/api/connections` | all app roles |
| GET | `/api/connections/:influencerProfileId/status` | brand, agency |
| DELETE | `/api/connections/:influencerProfileId` | brand, agency |

```json
{ "influencerProfileId": "68f0...", "note": "optional" }
```

```json
{
  "success": true,
  "message": "Connected successfully",
  "connection": {
    "id": "...",
    "status": "connected",
    "influencerProfileId": "...",
    "influencer": { "id": "...", "name": "...", "profileImageUrl": "..." },
    "connectedAt": "..."
  }
}
```

Status: `{ "success": true, "isConnected": true, "connection": {...} }`

---

## 3. Discovery — LIVE

```http
GET /api/influencers?search=&niche=&city=&limit=30
GET /api/brands?search=&industry=&city=&limit=30
GET /api/agencies?search=&agencyType=&niche=&city=&limit=30
```

Auth: any app role. Response includes `count` + role array (`influencers`/`brands`/`agencies`) + `data`.

Brand/agency list items now include `profileImageUrl`, `coverImageUrl`, `brandId`/`agencyId`, `ownerProfileId`.

---

## 4. Brand details + campaigns — LIVE (NEW)

```http
GET /api/brands/:brandProfileId
GET /api/brands/:brandProfileId/campaigns
```

### Brand profile sample

```json
{
  "success": true,
  "brand": {
    "id": "...",
    "brandId": "...",
    "ownerProfileId": "...",
    "brandName": "Kartik",
    "city": "Mumbai",
    "industry": "Fashion & Apparel",
    "profileImageUrl": "https://.../uploads/profile-images/....jpg",
    "coverImageUrl": "https://...",
    "instagramHandle": "kartik.brand",
    "website": "https://...",
    "bio": "..."
  },
  "profile": { "...same..." }
}
```

### Brand campaigns sample (active only)

```json
{
  "success": true,
  "count": 2,
  "campaigns": [
    {
      "id": "...",
      "title": "Diwali Reels",
      "budget": 50000,
      "budgetAmount": 50000,
      "budgetDisplay": "INR 50,000",
      "deadline": "2026-10-01T00:00:00.000Z",
      "applicationDeadline": "2026-10-01T00:00:00.000Z",
      "coverImageUrl": "https://...",
      "category": "Fashion",
      "status": "active",
      "brandProfileId": "...",
      "ownerProfileId": "..."
    }
  ]
}
```

---

## 5. Agency details + campaigns — LIVE (NEW)

```http
GET /api/agencies/:agencyProfileId
GET /api/agencies/:agencyProfileId/campaigns
```

Same pattern as brand. Campaigns owned by agency (`ownerRole=agency` / `agencyProfileId`).

---

## 6. Creator public profile — LIVE (enhanced)

```http
GET /api/profiles/:profileId
```

**Influencer only** (brand/agency IDs → use `/api/brands/:id` or `/api/agencies/:id`).

Confirmed fields:

| Need | Fields |
|------|--------|
| Manager WhatsApp | `managerMobile`, `manager.whatsapp`, `whatsapp`, `contactWhatsApp` |
| IG / YT | `instagramHandle`, `youtubeHandle`, `platforms[]` |
| Niches | `niches`, `contentCategories` |
| Rates | `rateRange` `{min,max,currency}` + `rateCard` `{currency,items[]}` |
| Portfolio | `portfolioLink`, `portfolioImages[]`, `mediaKit` |
| Cover / avatar | `coverImageUrl`, `profileImageUrl`, `avatarUrl`, `imageUrl` |

---

## 7. Uploads — LIVE

```http
POST /api/uploads
Content-Type: multipart/form-data
field: file
```

Accepts `image/*` and `application/octet-stream` (max 5MB).

```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "url": "https://viralflight.cloud/uploads/profile-images/....jpg",
  "publicUrl": "https://viralflight.cloud/uploads/profile-images/....jpg",
  "data": { "url": "...", "publicUrl": "..." }
}
```

Then PATCH profile with that URL:

```http
PATCH /api/profiles/me
{ "profileImageUrl": "...", "coverImageUrl": "..." }
```

Brand & agency both accept/return `coverImageUrl` and `profileImageUrl`.

---

## 8. Agency dashboard KPIs — LIVE (NEW)

```http
GET /api/agency/dashboard
```

```json
{
  "success": true,
  "stats": {
    "activeBrands": 3,
    "activeCampaigns": 5,
    "creators": 120,
    "pendingApprovals": 8,
    "budget": 250000,
    "analytics": {
      "campaignViews": 0,
      "applications": 8,
      "activeCollaborations": 2,
      "pendingInvites": 1
    },
    "revenue": 0
  },
  "note": "revenue and analytics.campaignViews stay 0 until billing/analytics tracking is wired"
}
```

---

## 9. Notifications — LIVE

```http
GET /api/notifications?page=1&limit=20&unreadOnly=true
POST /api/notifications/:notificationId/read
POST /api/notifications/read-all
```

DTO: `id`, `title`, `body`, `type`, `targetId`, `metadata`, `isRead`, `createdAt` + `unreadCount`, `pagination`.

Inbox can be live.

---

## Campaign create ownership (for Flutter)

When brand creates campaign (`POST /api/brand/campaigns`), backend sets:

- `ownerRole: "brand"`
- `ownerUserId`, `ownerProfileId` (= brand profile id)
- `brandUserId`, `brandProfileId`, `brandName`

Agency create (`POST /api/agency/campaigns`):

- `ownerRole: "agency"`
- `agencyUserId`, `agencyProfileId`

Use **`influencerProfileId`** for connect/quote/invite — never the User `_id` unless docs say `userId`.
