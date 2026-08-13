'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'

import { askViralFlightAgent } from './actions'
import type { AgentResultCard, ChatMessage } from './types'

type UiMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  cards?: AgentResultCard[]
}

const SUGGESTIONS = [
  'Delhi influencers under ₹20,000 budget',
  'Fashion creators in Mumbai with 50k+ followers',
  'List agencies in Bengaluru',
  'Beauty influencers with Instagram connected',
]

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function AgentChat({ initialPrompt = '' }: { initialPrompt?: string }) {
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi — main Viral Flight AI hoon. App jaisi language mein poochho: “Delhi influencers under 20k”, “Mumbai fashion 100k+ followers”, ya “show Bengaluru agencies”.',
    },
  ])
  const [input, setInput] = useState(initialPrompt)
  const [pending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, pending])

  function historyForApi(): ChatMessage[] {
    return messages
      .filter((item) => item.id !== 'welcome')
      .map((item) => ({ role: item.role, content: item.content }))
  }

  function submit(text: string) {
    const message = text.trim()
    if (!message || pending) return

    const userMsg: UiMessage = { id: uid(), role: 'user', content: message }
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    startTransition(async () => {
      const result = await askViralFlightAgent({
        message,
        history: historyForApi(),
      })
      // Deduplicate cards by href
      const seen = new Set<string>()
      const cards = (result.cards || []).filter((card) => {
        if (seen.has(card.href)) return false
        seen.add(card.href)
        return true
      })

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          content: result.reply,
          cards,
        },
      ])
    })
  }

  return (
    <div className="agent-layout">
      <div className="agent-chat panel">
        <div className="panel-header">
          <h2>Conversation</h2>
          <span>Live database · AI</span>
        </div>

        <div className="agent-messages">
          {messages.map((message) => (
            <div className={`agent-bubble ${message.role}`} key={message.id}>
              <p>{message.content}</p>
              {message.cards?.length ? (
                <div className="agent-cards">
                  {message.cards.map((card) => (
                    <Link className="agent-card" href={card.href} key={card.href}>
                      {card.imageUrl ? (
                        <img alt="" className="vf-avatar" src={card.imageUrl} />
                      ) : null}
                      <strong>{card.title}</strong>
                      <span>{card.subtitle}</span>
                      <em>{card.meta}</em>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {pending ? (
            <div className="agent-bubble assistant pending">
              <p>Searching Viral Flight database…</p>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div className="agent-suggest">
          {SUGGESTIONS.map((item) => (
            <button
              disabled={pending}
              key={item}
              onClick={() => submit(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>

        <form
          className="agent-composer"
          onSubmit={(event) => {
            event.preventDefault()
            submit(input)
          }}
        >
          <input
            disabled={pending}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask anything… e.g. Delhi beauty creators under 15k"
            value={input}
          />
          <button className="filter-button" disabled={pending || !input.trim()} type="submit">
            Ask
          </button>
        </form>
      </div>
    </div>
  )
}
