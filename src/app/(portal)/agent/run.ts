import { getOpenAiRuntimeConfig } from '../crm/settings'
import type { AgentResultCard, AgentTurnResult, ChatMessage } from './types'
import { AGENT_TOOL_DEFINITIONS, runAgentTool } from './tools'

export type { AgentResultCard, AgentTurnResult, ChatMessage } from './types'

type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
  name?: string
}

const SYSTEM_PROMPT = `You are Viral Flight AI, the internal company CRM assistant for Viral Flight owners and ops staff.

You help find influencers and agencies from the live Viral Flight app database using tools only.
Speak in clear, concise English or Hindi-English mix matching the user.
Never invent creators, rates, follower counts, or contact details — only use tool results.
When listing people, summarize filters used, total matches, then highlight top fits.
Currency is INR unless stated otherwise.
Budget phrasing:
- "under 20k" / "budget 20000" => maxBudget=20000
- "above 50k rates" => minBudget=50000
Cities: normalize aliases (Bangalore->Bengaluru, Bombay->Mumbai, NCR->Delhi).
If a query is vague, ask one short clarifying question OR run a reasonable broad search.
After tools return, write a useful answer with bullet points for the top results (name, city, niche, followers, rate range).
Do not mention internal tool names unless asked.`

function cardsFromToolPayload(name: string, payload: unknown): AgentResultCard[] {
  if (!payload || typeof payload !== 'object') return []
  const data = payload as {
    results?: Array<Record<string, unknown>>
    profile?: Record<string, unknown>
  }

  if (name === 'get_influencer' && data.profile) {
    const p = data.profile
    const rateMin = p.rateMin != null ? `₹${p.rateMin}` : '—'
    const rateMax = p.rateMax != null ? `₹${p.rateMax}` : '—'
    return [
      {
        kind: 'influencer',
        id: String(p.id),
        title: String(p.name),
        subtitle: `${p.city || 'City n/a'} · ${Array.isArray(p.niches) ? p.niches.slice(0, 2).join(', ') : '—'}`,
        meta: `${Number(p.followers || 0).toLocaleString('en-IN')} followers · ${rateMin}–${rateMax}`,
        href: String(p.href || `/influencers/${p.id}`),
        imageUrl: String(p.photoUrl || ''),
      },
    ]
  }

  if (!Array.isArray(data.results)) return []
  if (name === 'search_agencies') {
    return data.results.map((row) => ({
      kind: 'agency' as const,
      id: String(row.id),
      title: String(row.name),
      subtitle: `${row.city || 'City n/a'} · ${row.agencyType || 'Agency'}`,
      meta: String(row.contactPerson || row.mobile || '—'),
      href: String(row.href || `/agencies/${row.id}`),
    }))
  }

  return data.results.map((row) => {
    const rateMin = row.rateMin != null ? `₹${Number(row.rateMin).toLocaleString('en-IN')}` : '—'
    const rateMax = row.rateMax != null ? `₹${Number(row.rateMax).toLocaleString('en-IN')}` : '—'
    const niches = Array.isArray(row.niches) ? row.niches.slice(0, 2).join(', ') : '—'
    return {
      kind: 'influencer' as const,
      id: String(row.id),
      title: String(row.name),
      subtitle: `${row.city || 'City n/a'} · ${niches}`,
      meta: `${Number(row.followers || 0).toLocaleString('en-IN')} followers · ${rateMin}–${rateMax}`,
      href: String(row.href || `/influencers/${row.id}`),
      imageUrl: String(row.photoUrl || ''),
    }
  })
}

async function openAiChat(
  messages: OpenAIMessage[],
  config: { apiKey: string; model: string },
) {
  if (!config.apiKey) {
    throw new Error('AI is not configured. Add keys in Settings.')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      messages,
      tools: AGENT_TOOL_DEFINITIONS,
      tool_choice: 'auto',
    }),
  })

  const json = (await response.json()) as {
    error?: { message?: string }
    choices?: Array<{ message: OpenAIMessage }>
  }

  if (!response.ok) {
    throw new Error(json.error?.message || `AI error (${response.status})`)
  }

  const message = json.choices?.[0]?.message
  if (!message) throw new Error('AI returned an empty response')
  return message
}

export async function runAgentTurn(
  history: ChatMessage[],
  userMessage: string,
): Promise<AgentTurnResult> {
  const trimmed = userMessage.trim()
  if (!trimmed) return { reply: 'Please ask a question about influencers or agencies.', cards: [] }

  const config = await getOpenAiRuntimeConfig()
  const logicConfig = { ...config, model: 'gpt-4o' }
  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history
      .filter((item) => item.role === 'user' || item.role === 'assistant')
      .slice(-12)
      .map((item) => ({
        role: item.role as 'user' | 'assistant',
        content: item.content,
      })),
    { role: 'user', content: trimmed },
  ]

  const cards: AgentResultCard[] = []
  let assistant = await openAiChat(messages, logicConfig)

  for (let round = 0; round < 4; round += 1) {
    const toolCalls = assistant.tool_calls || []
    if (!toolCalls.length) {
      return {
        reply: String(assistant.content || 'Done.').trim(),
        cards,
      }
    }

    messages.push({
      role: 'assistant',
      content: assistant.content || null,
      tool_calls: toolCalls,
    })

    for (const call of toolCalls) {
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>
      } catch {
        args = {}
      }
      const payload = await runAgentTool(call.function.name, args)
      cards.push(...cardsFromToolPayload(call.function.name, payload))
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify(payload),
      })
    }

    assistant = await openAiChat(messages, logicConfig)
  }

  return {
    reply: String(assistant.content || 'I found some results — open the cards below.').trim(),
    cards,
  }
}
