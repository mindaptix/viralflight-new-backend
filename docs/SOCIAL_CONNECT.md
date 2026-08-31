# Viral Flight — Social Connect API (Instagram + Facebook)

Backend APIs for influencer Instagram and Facebook OAuth via the official Meta Graph API.

## Prerequisites

- Node.js 18+
- MongoDB
- Meta Developer App with Facebook Login + Instagram Graph API products

## Quick Start

```bash
cp .env.example .env
# Fill in META_APP_ID, META_APP_SECRET, JWT_SECRET, MONGO_URI

npm install
npm run dev
```

Server runs on `http://localhost:5000` by default.

## Meta Developer App Setup

1. Go to [Meta for Developers](https://developers.facebook.com/) and create a **Business** app.
2. Add products: **Facebook Login** and **Instagram Graph API**.
3. Under **Facebook Login → Settings**, add Valid OAuth Redirect URIs:
   - `https://viralflight.cloud/api/influencer/instagram/callback`
   - `https://viralflight.cloud/api/influencer/facebook/callback`
   - Local dev: `http://localhost:5000/api/influencer/instagram/callback`
   - Local dev: `http://localhost:5000/api/influencer/facebook/callback`
4. Request these permissions in **App Review**:
   - `instagram_basic`, `instagram_manage_insights`
   - `pages_show_list`, `pages_read_engagement`, `read_insights`
   - `business_management`
5. Copy App ID and App Secret into `.env`.

### Environment Variables

```env
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI_INSTAGRAM=https://viralflight.cloud/api/influencer/instagram/callback
META_REDIRECT_URI_FACEBOOK=https://viralflight.cloud/api/influencer/facebook/callback
META_GRAPH_API_VERSION=v21.0
META_TOKEN_ENCRYPTION_KEY=
JWT_SECRET=
MONGO_URI=
```

Legacy `INSTAGRAM_*` env vars are supported as fallbacks.

## API Endpoints

Protected routes require `Authorization: Bearer <JWT>` with `role=influencer`.

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/influencer/instagram/connect-url` | Yes |
| GET | `/api/influencer/instagram/callback` | No |
| GET | `/api/influencer/instagram/stats` | Yes |
| POST | `/api/influencer/instagram/sync` | Yes |
| GET | `/api/influencer/facebook/connect-url` | Yes |
| GET | `/api/influencer/facebook/callback` | No |
| GET | `/api/influencer/facebook/stats` | Yes |
| POST | `/api/influencer/facebook/sync` | Yes |

Rate limit: connect-url and sync — 10 requests/minute per user.

## cURL Examples

```bash
# Instagram connect URL
curl -s -H "Authorization: Bearer YOUR_JWT" \
  https://viralflight.cloud/api/influencer/instagram/connect-url

# Instagram stats
curl -s -H "Authorization: Bearer YOUR_JWT" \
  https://viralflight.cloud/api/influencer/instagram/stats

# Instagram sync
curl -s -X POST -H "Authorization: Bearer YOUR_JWT" \
  https://viralflight.cloud/api/influencer/instagram/sync

# Facebook connect URL
curl -s -H "Authorization: Bearer YOUR_JWT" \
  https://viralflight.cloud/api/influencer/facebook/connect-url

# Facebook stats
curl -s -H "Authorization: Bearer YOUR_JWT" \
  https://viralflight.cloud/api/influencer/facebook/stats

# Facebook sync
curl -s -X POST -H "Authorization: Bearer YOUR_JWT" \
  https://viralflight.cloud/api/influencer/facebook/sync
```

## Sample Responses

**Connect URL:**
```json
{ "success": true, "connectUrl": "https://www.facebook.com/v21.0/dialog/oauth?..." }
```

**Instagram connected:**
```json
{
  "success": true,
  "instagram": {
    "isConnected": true,
    "handle": "ananya.creates",
    "instagramUserId": "17841401234567890",
    "followers": 812000,
    "followersDisplay": "812K",
    "follows": 1200,
    "mediaCount": 420,
    "engagementRate": 4.2,
    "profilePictureUrl": "https://...",
    "accountType": "CREATOR",
    "lastSyncedAt": "2026-08-31T10:00:00.000Z"
  }
}
```

**Not connected:**
```json
{
  "success": true,
  "instagram": {
    "isConnected": false,
    "handle": "",
    "followers": 0,
    "followersDisplay": "0"
  }
}
```

## Architecture

- `src/models/InfluencerSocialConnection.js` — MongoDB collection
- `src/infrastructure/external/meta/MetaGraphService.js` — OAuth + Graph API
- `src/application/social/SocialConnectionService.js` — business logic
- `src/jobs/socialStatsSyncJob.js` — nightly cron (24h)

Postman collection: `postman/ViralFlight-Social-Connect.postman_collection.json`
