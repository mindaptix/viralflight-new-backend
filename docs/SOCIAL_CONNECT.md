# Viral Flight — Social Connect API (Instagram, Facebook, YouTube)

Backend APIs for influencer social OAuth: Instagram Login, Facebook Pages, and YouTube Data API.

## Prerequisites

- Node.js 18+
- MongoDB
- Meta Developer App with **Instagram API with Instagram Login** + Facebook Login
- Google Cloud project with YouTube Data API v3

## Quick Start

```bash
cp .env.example .env
# Fill in META_APP_ID, META_APP_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET, MONGO_URI

npm install
npm run dev
```

Server runs on `http://localhost:5000` by default.

## Meta Developer App Setup (Instagram + Facebook)

1. Go to [Meta for Developers](https://developers.facebook.com/) and create a **Business** app.
2. Add products:
   - **Instagram API with Instagram Login** (required so mobile users see Instagram login, not Facebook)
   - **Facebook Login** (for Facebook Page connect)
3. Instagram Login → Valid OAuth Redirect URIs:
   - `https://viralflight.cloud/api/influencer/instagram/callback`
   - Local: `http://localhost:5000/api/influencer/instagram/callback`
4. Facebook Login → Valid OAuth Redirect URIs:
   - `https://viralflight.cloud/api/influencer/facebook/callback`
   - Local: `http://localhost:5000/api/influencer/facebook/callback`
5. Instagram Login permissions:
   - `instagram_business_basic`
   - `instagram_business_manage_insights`
6. Facebook Page permissions:
   - `pages_show_list`, `pages_read_engagement`, `read_insights`, `business_management`
7. Copy App ID and App Secret into `.env`.

## Google Cloud Setup (YouTube)

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create/select a project.
2. Enable **YouTube Data API v3**.
3. Create **OAuth 2.0 Client ID** (application type: Web application).
4. Add Authorized redirect URI:
   - `https://viralflight.cloud/api/influencer/youtube/callback`
   - Local: `http://localhost:5000/api/influencer/youtube/callback`
5. Copy Client ID and Client Secret into `.env`.

### Environment Variables

```env
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI_INSTAGRAM=https://viralflight.cloud/api/influencer/instagram/callback
META_REDIRECT_URI_FACEBOOK=https://viralflight.cloud/api/influencer/facebook/callback
META_GRAPH_API_VERSION=v21.0
META_TOKEN_ENCRYPTION_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=https://viralflight.cloud/api/influencer/youtube/callback
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
| GET | `/api/influencer/youtube/connect-url` | Yes |
| GET | `/api/influencer/youtube/callback` | No |
| GET | `/api/influencer/youtube/stats` | Yes |
| POST | `/api/influencer/youtube/sync` | Yes |

Rate limit: connect-url and sync — 10 requests/minute per user.

## cURL Examples

```bash
# Instagram connect URL (must be instagram.com, not facebook.com)
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

# YouTube connect URL
curl -s -H "Authorization: Bearer YOUR_JWT" \
  https://viralflight.cloud/api/influencer/youtube/connect-url

# YouTube stats
curl -s -H "Authorization: Bearer YOUR_JWT" \
  https://viralflight.cloud/api/influencer/youtube/stats

# YouTube sync
curl -s -X POST -H "Authorization: Bearer YOUR_JWT" \
  https://viralflight.cloud/api/influencer/youtube/sync
```

## Sample Responses

**Instagram connect URL:**
```json
{ "success": true, "connectUrl": "https://www.instagram.com/oauth/authorize?client_id=..." }
```

**Facebook connect URL:**
```json
{ "success": true, "connectUrl": "https://www.facebook.com/v21.0/dialog/oauth?..." }
```

**YouTube connect URL:**
```json
{ "success": true, "connectUrl": "https://accounts.google.com/o/oauth2/v2/auth?..." }
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

**YouTube connected:**
```json
{
  "success": true,
  "youtube": {
    "isConnected": true,
    "handle": "Channel Name",
    "channelName": "Channel Name",
    "youtubeChannelId": "UCxxxxxxxx",
    "followers": 125000,
    "followersDisplay": "125K",
    "profilePictureUrl": "https://...",
    "accountType": "CHANNEL",
    "lastSyncedAt": "2026-08-31T10:00:00.000Z"
  }
}
```

**Not connected (always HTTP 200):**
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
- `src/infrastructure/external/meta/MetaGraphService.js` — Instagram Login + Facebook Graph
- `src/infrastructure/external/youtube/YoutubeOAuthService.js` — Google OAuth + YouTube Data API
- `src/application/social/SocialConnectionService.js` — business logic
- `src/jobs/socialStatsSyncJob.js` — nightly cron (24h)

Postman collection: `postman/ViralFlight-Social-Connect.postman_collection.json`
