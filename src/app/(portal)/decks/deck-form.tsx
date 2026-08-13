'use client'

import { useState, useTransition } from 'react'

import { generateDeckAction } from './actions'

export function DeckForm({
  campaigns,
  defaultCampaignId,
  defaultClientName,
}: {
  campaigns: Array<{ id: string; title: string; clientName: string }>
  defaultCampaignId?: string
  defaultClientName?: string
}) {
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function submit() {
    const form = document.getElementById('deck-form') as HTMLFormElement | null
    if (!form) return
    const formData = new FormData(form)
    startTransition(async () => {
      setError('')
      const result = await generateDeckAction(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <article className="panel">
      <div className="panel-header">
        <h2>New client PPT</h2>
        <span>Written by AI from campaign data</span>
      </div>
      <form className="crm-form deck-form" id="deck-form">
        <label>
          Client
          <input
            defaultValue={defaultClientName}
            name="clientName"
            placeholder="Glow Co, SoundZ…"
          />
        </label>
        <label>
          Pull from campaign
          <select defaultValue={defaultCampaignId || ''} name="campaignId">
            <option value="">No campaign — notes only</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.title}
                {campaign.clientName ? ` · ${campaign.clientName}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="grow">
          Extra direction
          <textarea
            name="notes"
            placeholder="What the client needs to see: objectives, budget, creator mix, next meeting ask…"
            rows={4}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="heading-actions">
          <button className="filter-button" disabled={pending} onClick={submit} type="button">
            {pending ? 'Building deck…' : 'Generate PPT with AI'}
          </button>
        </div>
      </form>
    </article>
  )
}
