import { getClaudeRuntimeConfig, getOpenAiRuntimeConfig } from '../crm/settings'

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

export async function suggestCampaignCopy(input: {
  prompt: string
  provider: 'claude' | 'openai' | 'auto'
}): Promise<{ draft: CampaignDraft; provider: string }> {
  const userPrompt = `Create a campaign pack from this brief:\n${input.prompt}`

  const wantClaude = input.provider === 'claude' || input.provider === 'auto'
  const wantOpenAi = input.provider === 'openai' || input.provider === 'auto'

  if (wantClaude) {
    const claude = await getClaudeRuntimeConfig()
    if (claude.apiKey) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': claude.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: claude.model,
          max_tokens: 1200,
          system: SYSTEM,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      })
      const json = (await response.json()) as {
        error?: { message?: string }
        content?: Array<{ text?: string }>
      }
      if (!response.ok) throw new Error(json.error?.message || 'Claude request failed')
      const text = json.content?.map((part) => part.text || '').join('\n') || ''
      return { draft: parseDraft(text), provider: 'claude' }
    }
    if (input.provider === 'claude') {
      throw new Error('Claude API key missing. Add it in Settings.')
    }
  }

  if (wantOpenAi) {
    const openai = await getOpenAiRuntimeConfig()
    if (!openai.apiKey) throw new Error('OpenAI API key missing. Add it in Settings.')
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: openai.model,
        temperature: 0.4,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userPrompt },
        ],
      }),
    })
    const json = (await response.json()) as {
      error?: { message?: string }
      choices?: Array<{ message?: { content?: string } }>
    }
    if (!response.ok) throw new Error(json.error?.message || 'OpenAI request failed')
    return { draft: parseDraft(json.choices?.[0]?.message?.content || ''), provider: 'openai' }
  }

  throw new Error('No AI provider configured')
}
