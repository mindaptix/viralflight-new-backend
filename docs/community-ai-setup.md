# Community AI scanning

Configure these variables on the backend only:

```dotenv
COMMUNITY_AI_API_KEY=<full Groq secret key>
GROQ_MODEL=openai/gpt-oss-20b
```

Neither value is bundled into Flutter. `GROQ_MODEL` is optional and defaults to `openai/gpt-oss-20b`. `GROQ_API_KEY` can be used instead of `COMMUNITY_AI_API_KEY`; it takes precedence when both are set. The old `COMMUNITY_AI_MODEL` value is ignored because `gemini` is not a Groq model. Without a key, status reports disabled and category recommendations keep working. Restart the backend with its updated environment after configuring these values.

## API

Authenticated influencer routes:

- `GET /api/v1/communities/recommendations/scan`: provider availability and saved scan summary.
- `POST /api/v1/communities/recommendations/scan` with `{ "consent": true }`: one explicit scan.
- `DELETE /api/v1/communities/recommendations/scan`: clear suggestions and invalidate any active scan so it cannot save later. This cannot recall a request already sent to the provider.

The service sends profile bio/categories and up to 12 permitted Instagram captions to Groq's chat completions API. Bio is limited to 2,000 characters and each caption to 1,000. It never includes user/contact identity fields or login tokens in the AI payload; personal text the creator includes in their bio/captions is included. If Instagram access fails, a profile-only scan is returned and labeled accordingly. It analyzes text, not image/video pixels. Category matching works without the scan.

Only topics from the community catalog are accepted, with up to eight saved. Captions are not stored by this feature. Review Groq's data retention terms separately; no zero-retention guarantee is made here. See https://console.groq.com/docs/api-reference for the API contract.

Saved topics boost community rankings for 30 days. Scanning is user-triggered and needs consent every time. A database lease prevents concurrent scans; a one-minute cooldown limits repeated attempts. Clearing suggestions invalidates the lease. Consent version/time and source are recorded with the successful scan.

## Verification

Run `node --test test/community_ai.test.js test/community_recommendations.test.js` and `npm run build`. Tests mock network requests and never send real profiles to Groq. A live smoke test requires a configured key, deployed backend, active community topics, and an influencer opting in through Communities → AI button.
