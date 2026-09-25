# AI campaign pitch drafts

Add these variables to the backend `.env` (never the Flutter app):

```dotenv
GROQ_API_KEY=<full Groq secret key>
GROQ_MODEL=openai/gpt-oss-20b
```

`GROQ_MODEL` is optional; the value above is the default. The existing `COMMUNITY_AI_API_KEY` can also supply the Groq key for all three AI features; `GROQ_API_KEY` takes precedence if both are set. `COMMUNITY_AI_MODEL=gemini` is ignored. Restart the backend after setting the key and deploying the updated code. A key's display name in the Groq console is not its secret value.

The authenticated `POST /api/v1/influencer/campaigns/:campaignId/generate-pitch` endpoint sends the campaign title, brand/owner name, category, description, and deliverables to Groq when the creator taps **Generate pitch with AI**. No creator profile, access token, or quoted rate is sent. The draft is returned to the app for editing; it is not submitted until the creator taps **Submit application**. Requests are limited to one per creator per minute.

The authenticated `POST /api/v1/influencer/profile/generate-bio` endpoint sends the creator's name, selected categories, profession, and languages to Groq when **Generate bio with AI** is tapped in Edit profile. Contact details, access tokens, and existing bio are excluded. The generated text is only saved after the creator taps **Save**. Bio generation is limited to one request per creator per minute.
