'use client'

import { useState, useTransition } from 'react'

import { researchInfluencerAction } from './intel-actions'
import type { InfluencerIntel } from './intel'

export function BrandWorkPanel({
  profileId,
  intel,
  vfWork,
}: {
  profileId: string
  intel: InfluencerIntel | null
  vfWork: Array<{
    campaignTitle: string
    clientName: string
    status: string
    instagramUrl: string
    href: string
  }>
}) {
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function research() {
    const formData = new FormData()
    formData.set('profileId', profileId)
    startTransition(async () => {
      setError('')
      const result = await researchInfluencerAction(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <article className="panel">
      <div className="panel-header">
        <h2>Brand work</h2>
        <button className="filter-button" disabled={pending} onClick={research} type="button">
          {pending ? 'Researching…' : intel ? 'Refresh with AI' : 'Research with AI'}
        </button>
      </div>
      <div className="brand-work">
        {intel ? (
          <>
            <p className="detail-bio">
              <strong>{intel.brandCount} brands</strong>
              {intel.summary ? ` — ${intel.summary}` : ''}
            </p>
            <ul className="brand-work-list">
              {intel.brands.map((brand) => (
                <li key={`${brand.source}-${brand.name}`}>
                  <div>
                    <strong>{brand.name}</strong>
                    <span>
                      {brand.work}
                      {brand.year ? ` · ${brand.year}` : ''}
                      {brand.category ? ` · ${brand.category}` : ''}
                    </span>
                  </div>
                  <em>{brand.confidence === 'confirmed' ? 'Confirmed' : 'Likely'}</em>
                  {brand.url ? (
                    <a href={brand.url} rel="noreferrer" target="_blank">
                      Work
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
            {intel.work.length ? (
              <>
                <h3>Notable work</h3>
                <ul className="brand-work-list">
                  {intel.work.map((item) => (
                    <li key={`${item.title}-${item.url}`}>
                      <div>
                        <strong>{item.title}</strong>
                        <span>
                          {item.type}
                          {item.summary ? ` · ${item.summary}` : ''}
                        </span>
                      </div>
                      {item.url ? (
                        <a href={item.url} rel="noreferrer" target="_blank">
                          Open
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        ) : vfWork.length ? (
          <ul className="brand-work-list">
            {vfWork.map((row) => (
              <li key={row.href + row.campaignTitle}>
                <div>
                  <strong>{row.clientName}</strong>
                  <span>
                    {row.campaignTitle} · {row.status}
                  </span>
                </div>
                <a href={row.href}>Campaign</a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            AI can look up other brands this creator has worked with, plus public reels and
            campaigns.
          </div>
        )}
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </article>
  )
}
