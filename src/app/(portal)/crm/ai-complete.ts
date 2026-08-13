import { getClaudeRuntimeConfig, getOpenAiRuntimeConfig } from './settings'

export type AiWorkKind = 'ui' | 'logic'

const MODELS = {
  ui: {
    claude: 'claude-sonnet-4-5',
    openai: 'gpt-4o',
  },
  logic: {
    openai: 'gpt-4o',
    claude: 'claude-sonnet-4-5',
  },
} as const

async function callClaude(input: {
  system: string
  user: string
  model: string
  maxTokens: number
}) {
  const claude = await getClaudeRuntimeConfig()
  if (!claude.apiKey) return null
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': claude.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: input.maxTokens,
      system: input.system,
      messages: [{ role: 'user', content: input.user }],
    }),
  })
  const json = (await response.json()) as {
    error?: { message?: string }
    content?: Array<{ text?: string }>
  }
  if (!response.ok) throw new Error(json.error?.message || 'AI request failed')
  return json.content?.map((part) => part.text || '').join('\n') || ''
}

async function callOpenAi(input: {
  system: string
  user: string
  model: string
}) {
  const openai = await getOpenAiRuntimeConfig()
  if (!openai.apiKey) return null
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openai.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model,
      temperature: 0.35,
      messages: [
        { role: 'system', content: input.system },
        { role: 'user', content: input.user },
      ],
    }),
  })
  const json = (await response.json()) as {
    error?: { message?: string }
    choices?: Array<{ message?: { content?: string } }>
  }
  if (!response.ok) throw new Error(json.error?.message || 'AI request failed')
  return json.choices?.[0]?.message?.content || ''
}

export async function completeJsonText(input: {
  system: string
  user: string
  kind: AiWorkKind
  maxTokens?: number
}): Promise<{ text: string }> {
  const maxTokens = input.maxTokens || 2200
  const models = MODELS[input.kind]
  const order =
    input.kind === 'ui'
      ? (['claude', 'openai'] as const)
      : (['openai', 'claude'] as const)

  let lastError: Error | null = null
  for (const vendor of order) {
    try {
      const text =
        vendor === 'claude'
          ? await callClaude({
              system: input.system,
              user: input.user,
              model: models.claude,
              maxTokens,
            })
          : await callOpenAi({
              system: input.system,
              user: input.user,
              model: models.openai,
            })
      if (text != null && text.trim()) return { text }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('AI request failed')
    }
  }

  throw lastError || new Error('AI is not configured. Add keys in Settings.')
}

function textFromClaudeContent(content: unknown) {
  if (!Array.isArray(content)) return ''
  return content
    .map((block) => {
      if (!block || typeof block !== 'object') return ''
      const item = block as { type?: string; text?: string }
      return item.type === 'text' ? String(item.text || '') : ''
    })
    .join('\n')
}

export async function completeClaudeResearch(input: {
  system: string
  user: string
  maxTokens?: number
}): Promise<string> {
  const claude = await getClaudeRuntimeConfig()
  if (!claude.apiKey) {
    const fallback = await completeJsonText({
      system: input.system,
      user: input.user,
      kind: 'ui',
      maxTokens: input.maxTokens || 2500,
    })
    return fallback.text
  }

  const body = {
    model: MODELS.ui.claude,
    max_tokens: input.maxTokens || 2500,
    system: input.system,
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 5,
      },
    ],
    messages: [{ role: 'user', content: input.user }],
  }

  const headers = {
    'x-api-key': claude.apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  }

  let response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  let json = (await response.json()) as {
    error?: { message?: string; type?: string }
    content?: unknown
  }

  if (!response.ok) {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: MODELS.ui.claude,
        max_tokens: input.maxTokens || 2500,
        system: input.system,
        messages: [{ role: 'user', content: input.user }],
      }),
    })
    json = (await response.json()) as {
      error?: { message?: string }
      content?: unknown
    }
    if (!response.ok) throw new Error(json.error?.message || 'AI research failed')
  }

  const text = textFromClaudeContent(json.content)
  if (!text.trim()) throw new Error('AI returned no research')
  return text
}
