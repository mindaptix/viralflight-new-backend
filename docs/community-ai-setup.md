# Community AI scanning

Configure these variables on the backend only:

```dotenv
COMMUNITY_AI_API_KEY=<OpenAI API key>
COMMUNITY_AI_MODEL=<Responses API model supporting structured outputs>
```

Neither value is bundled into Flutter. No default credential is used. Without both variables, status reports disabled and category recommendations keep working. Restart the backend with its updated environment after configuring these values.

## API

Authenticated influencer routes:

- `GET /api/v1/communities/recommendations/scan`: provider availability and saved scan summary.
- `POST /api/v1/communities/recommendations/scan` with `{ "consent": true }`: one explicit scan.
- `DELETE /api/v1/communities/recommendations/scan`: clear suggestions and invalidate any active scan so it cannot save later. This cannot recall a request already sent to the provider.

The service sends profile bio/categories and up to 12 permitted Instagram captions to OpenAI's Responses API. Bio is limited to 2,000 characters and each caption to 1,000. It never includes user/contact identity fields or login tokens in the AI payload; personal text the creator includes in their bio/captions is included. If Instagram access fails, a profile-only scan is returned and labeled accordingly. It analyzes text, not image/video pixels. Category matching works without the scan.

Only topics from the community catalog are accepted, with up to eight saved. Captions are not stored by this feature. OpenAI requests use `store: false`; this is not a promise of zero retention by the provider. See https://developers.openai.com/api/docs/guides/structured-outputs for the structured output contract.

Saved topics boost community rankings for 30 days. Scanning is user-triggered and needs consent every time. A database lease prevents concurrent scans; a one-minute cooldown limits repeated attempts. Clearing suggestions invalidates the lease. Consent version/time and source are recorded with the successful scan.

## Verification

Run `node --test test/community_ai.test.js test/community_recommendations.test.js` and `npm run build`. Tests mock network requests and never send real profiles to OpenAI. A live smoke test requires a configured key/model, deployed backend, and an influencer opting in through Communities → AI button.
