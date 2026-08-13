import { completeJsonText } from '../crm/ai-complete'

export type DeckSlide = {
  heading: string
  bullets: string[]
  note: string
  kind: 'title' | 'content' | 'stats' | 'closing'
}

export type DeckOutline = {
  title: string
  subtitle: string
  clientName: string
  slides: DeckSlide[]
}

const SYSTEM = `You are Viral Flight's client presentation writer for Indian influencer marketing.
Return ONLY valid JSON:
{
  "title": string,
  "subtitle": string,
  "clientName": string,
  "slides": [
    { "kind": "title"|"content"|"stats"|"closing", "heading": string, "bullets": string[], "note": string }
  ]
}
Rules:
- 8 to 11 slides.
- First slide kind=title. Last slide kind=closing.
- Include: campaign snapshot, objectives, audience, creator mix, content plan, timeline, commercials, next steps.
- If performance numbers are in the brief, add a stats slide.
- Bullets: max 5 per slide, short, client-ready (no internal slang).
- Currency INR. Tone: confident, practical, no fluff.
- Speaker notes in "note" (1-2 sentences).`

function parseOutline(text: string, fallbackClient: string): DeckOutline {
  const match = text.match(/\{[\s\S]*\}/)
  const json = JSON.parse(match ? match[0] : '{}') as Partial<DeckOutline>
  const slidesRaw = Array.isArray(json.slides) ? json.slides : []
  const slides = slidesRaw.slice(0, 12).map((slide, index) => {
    const item = slide && typeof slide === 'object' ? slide : {}
    const kindRaw = String(item.kind || 'content')
    const kind =
      kindRaw === 'title' || kindRaw === 'stats' || kindRaw === 'closing' ? kindRaw : 'content'
    return {
      kind: index === 0 ? 'title' : kind,
      heading: String(item.heading || `Slide ${index + 1}`).slice(0, 90),
      bullets: (Array.isArray(item.bullets) ? item.bullets : [])
        .map((bullet) => String(bullet || '').trim())
        .filter(Boolean)
        .slice(0, 6),
      note: String(item.note || '').slice(0, 400),
    }
  })
  if (!slides.length) {
    slides.push({
      kind: 'title',
      heading: String(json.title || 'Viral Flight campaign'),
      bullets: ['Client presentation'],
      note: '',
    })
  }
  return {
    title: String(json.title || 'Client presentation').slice(0, 120),
    subtitle: String(json.subtitle || 'Prepared by Viral Flight').slice(0, 180),
    clientName: String(json.clientName || fallbackClient).slice(0, 80),
    slides,
  }
}

export async function generateClientDeckOutline(input: {
  clientName: string
  notes: string
  campaignContext: string
}): Promise<{ outline: DeckOutline }> {
  const user = [
    `Client: ${input.clientName || 'the brand'}`,
    input.campaignContext ? `Campaign data:\n${input.campaignContext}` : '',
    input.notes ? `Account manager notes:\n${input.notes}` : '',
    'Build a client-ready PPT outline Viral Flight can present or email.',
  ]
    .filter(Boolean)
    .join('\n\n')

  const result = await completeJsonText({
    system: SYSTEM,
    user,
    kind: 'ui',
    maxTokens: 2500,
  })
  return {
    outline: parseOutline(result.text, input.clientName),
  }
}
