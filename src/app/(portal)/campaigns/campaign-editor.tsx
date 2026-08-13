'use client'

import { useState, useTransition, type ReactNode } from 'react'

import { suggestCampaignAction } from './actions'

type Draft = {
  title: string
  clientName: string
  brandName: string
  description: string
  brief: string
  category: string
  scriptGuidelines: string
  deliverable: string
  slotsNeeded: string
  budgetAmount: string
  location: string
  scriptDeadline: string
  videoDeadline: string
}

const empty: Draft = {
  title: '',
  clientName: '',
  brandName: '',
  description: '',
  brief: '',
  category: '',
  scriptGuidelines: '',
  deliverable: 'reel',
  slotsNeeded: '20',
  budgetAmount: '',
  location: '',
  scriptDeadline: '',
  videoDeadline: '',
}

export function CampaignEditor({
  action,
  initial,
  submitLabel,
  extraFields,
}: {
  action: (formData: FormData) => void | Promise<void>
  initial?: Partial<Draft>
  submitLabel: string
  extraFields?: ReactNode
}) {
  const [draft, setDraft] = useState<Draft>({ ...empty, ...initial })
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function suggest() {
    const formData = new FormData()
    formData.set(
      'prompt',
      prompt ||
        `Client ${draft.clientName || 'a brand'}, ${draft.slotsNeeded} ${draft.deliverable}s, city ${draft.location || 'India'}. ${draft.brief}`,
    )
    startTransition(async () => {
      setError('')
      const result = await suggestCampaignAction(formData)
      if (result.error) {
        setError(result.error)
        return
      }
      setDraft((prev) => ({
        ...prev,
        title: result.title || prev.title,
        description: result.description || prev.description,
        brief: result.brief || prev.brief,
        category: result.category || prev.category,
        scriptGuidelines: result.scriptGuidelines || prev.scriptGuidelines,
        deliverable: result.deliverable || prev.deliverable,
      }))
    })
  }

  return (
    <div className="campaign-editor">
      <article className="panel">
        <div className="panel-header">
          <h2>AI assist</h2>
          <span>Drafts copy for this campaign</span>
        </div>
        <div className="crm-form settings-form">
          <label>
            Tell AI what this campaign is
            <textarea
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="e.g. Nykaa summer sale, 20 Instagram reels, Delhi/Mumbai beauty creators, fun unboxing + 1 CTA"
              rows={3}
              value={prompt}
            />
          </label>
          <div className="settings-actions">
            <button className="filter-button" disabled={pending} onClick={suggest} type="button">
              {pending ? 'Writing…' : 'Generate with AI'}
            </button>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <p className="settings-help">
            AI fills title, description, brief and script guidelines. You can edit everything before saving.
          </p>
        </div>
      </article>

      <form action={action} className="panel crm-form settings-form">
        <div className="panel-header">
          <h2>Campaign details</h2>
          <span>Editable</span>
        </div>
        {extraFields}
        <label>
          Title
          <input name="title" onChange={(event) => set('title', event.target.value)} required value={draft.title} />
        </label>
        <div className="detail-kv" style={{ padding: 0 }}>
          <label>
            Client
            <input name="clientName" onChange={(event) => set('clientName', event.target.value)} value={draft.clientName} />
          </label>
          <label>
            Brand
            <input name="brandName" onChange={(event) => set('brandName', event.target.value)} value={draft.brandName} />
          </label>
        </div>
        <label>
          Description
          <textarea
            name="description"
            onChange={(event) => set('description', event.target.value)}
            rows={4}
            value={draft.description}
          />
        </label>
        <label>
          Brief
          <textarea name="brief" onChange={(event) => set('brief', event.target.value)} rows={4} value={draft.brief} />
        </label>
        <label>
          Script guidelines
          <textarea
            name="scriptGuidelines"
            onChange={(event) => set('scriptGuidelines', event.target.value)}
            rows={4}
            value={draft.scriptGuidelines}
          />
        </label>
        <div className="detail-kv" style={{ padding: 0 }}>
          <label>
            Category
            <input name="category" onChange={(event) => set('category', event.target.value)} value={draft.category} />
          </label>
          <label>
            Deliverable
            <select
              name="deliverable"
              onChange={(event) => set('deliverable', event.target.value)}
              value={draft.deliverable}
            >
              <option value="reel">Reel</option>
              <option value="post">Post</option>
              <option value="story">Story</option>
              <option value="youtube">YouTube</option>
            </select>
          </label>
          <label>
            Creators needed
            <input
              min={1}
              name="slotsNeeded"
              onChange={(event) => set('slotsNeeded', event.target.value)}
              type="number"
              value={draft.slotsNeeded}
            />
          </label>
          <label>
            Budget (INR)
            <input
              min={0}
              name="budgetAmount"
              onChange={(event) => set('budgetAmount', event.target.value)}
              type="number"
              value={draft.budgetAmount}
            />
          </label>
          <label>
            Location
            <input name="location" onChange={(event) => set('location', event.target.value)} value={draft.location} />
          </label>
          <label>
            Script deadline
            <input
              name="scriptDeadline"
              onChange={(event) => set('scriptDeadline', event.target.value)}
              type="date"
              value={draft.scriptDeadline?.slice(0, 10)}
            />
          </label>
          <label>
            Video deadline
            <input
              name="videoDeadline"
              onChange={(event) => set('videoDeadline', event.target.value)}
              type="date"
              value={draft.videoDeadline?.slice(0, 10)}
            />
          </label>
        </div>
        <input name="platforms" type="hidden" value="instagram" />
        <button className="primary-button" type="submit">
          {submitLabel}
        </button>
      </form>
    </div>
  )
}
