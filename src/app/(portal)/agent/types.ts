export type ChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type AgentResultCard = {
  kind: 'influencer' | 'agency'
  id: string
  title: string
  subtitle: string
  meta: string
  href: string
  imageUrl?: string
}

export type AgentTurnResult = {
  reply: string
  cards: AgentResultCard[]
  error?: string
}
