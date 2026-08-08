'use server'

import { requireSuperAdmin } from '../lib/auth'
import { runAgentTurn } from './run'
import type { AgentTurnResult, ChatMessage } from './types'

export async function askViralFlightAgent(input: {
  message: string
  history?: ChatMessage[]
}): Promise<AgentTurnResult> {
  await requireSuperAdmin()

  try {
    return await runAgentTurn(input.history || [], input.message)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Agent failed'
    return {
      reply: `Sorry — I could not complete that request.\n\n${message}`,
      cards: [],
      error: message,
    }
  }
}
