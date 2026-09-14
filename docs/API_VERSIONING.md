# Mobile API v1

The Flutter app uses `/api/v1`. The backend also serves the same handlers at
legacy `/api` paths for existing releases and registered OAuth callbacks.
Deploy the backend before releasing the updated mobile app.

Role-specific workflows retain `/agency`, `/brand`, or `/influencer`: onboarding,
own profiles, owner campaign lists, discovery feeds, applications and social stats.
Shared resources retain generic paths: `/campaigns/:id`, `/profiles/me`,
`/profiles/:id`, `/notifications`, `/uploads`, and public discovery directories.
JWT middleware and resource ownership checks remain authoritative; path names
do not grant permissions. Agency campaign deletion remains agency-owner only.

Examples: `/api/v1/agency/campaigns`, `/api/v1/brand/creators`,
`/api/v1/influencer/applications`, `/api/v1/campaigns/:id`.

CMS/Next routes, `/uploads` media URLs and OAuth redirect configuration are
unchanged. Unknown v1 endpoints return JSON 404 rather than falling into CMS.
Versioning does not implement previously unavailable endpoints (for example,
the upload presign handler still returns 501).
