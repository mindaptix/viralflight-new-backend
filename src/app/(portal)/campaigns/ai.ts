import { completeJsonText } from '../crm/ai-complete'

export type CampaignDraft = {
  title: string
  description: string
  brief: string
  category: string
  scriptGuidelines: string
  deliverable: string
}

const SYSTEM = `You are Viral Flight's in-house campaign producer.
Return ONLY valid JSON with keys:
title, description, brief, category, scriptGuidelines, deliverable
deliverable should be one of: reel, post, story, youtube
Write for Indian influencer marketing. Keep copy practical and brand-safe.`

function parseDraft(text: string): CampaignDraft {
  const match = text.match(/\{[\s\S]*\}/)
  const raw = match ? match[0] : '{}'
  const json = JSON.parse(raw) as Partial<CampaignDraft>
  return {
    title: String(json.title || '').slice(0, 120),
    description: String(json.description || '').slice(0, 4000),
    brief: String(json.brief || '').slice(0, 4000),
    category: String(json.category || 'Lifestyle').slice(0, 80),
    scriptGuidelines: String(json.scriptGuidelines || '').slice(0, 4000),
    deliverable: ['reel', 'post', 'story', 'youtube'].includes(String(json.deliverable))
      ? String(json.deliverable)
      : 'reel',
  }
}

export async function suggestCampaignCopy(input: { prompt: string }): Promise<CampaignDraft> {
  const result = await completeJsonText({
    system: SYSTEM,
    user: `Create a campaign pack from this brief:\n${input.prompt}`,
    kind: 'ui',
    maxTokens: 1400,
  })
  return parseDraft(result.text)
}
