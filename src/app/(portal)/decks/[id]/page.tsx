import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PortalShell } from '../../components/portal-shell'
import { requireSuperAdmin } from '../../lib/auth'
import { formatDate } from '../../lib/format'
import { getClientDeck } from '../data'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function DeckDetailPage({ params }: PageProps) {
  const user = await requireSuperAdmin()
  const { id } = await params
  const deck = await getClientDeck(id)
  if (!deck) notFound()

  return (
    <PortalShell active="decks" user={user}>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">
            <Link href="/decks">← Client PPT</Link>
          </p>
          <h1>{deck.title}</h1>
          <p>
            {deck.clientName || 'Client'} · {deck.slides.length} slides ·{' '}
            {formatDate(deck.createdAt)}
          </p>
        </div>
        <div className="heading-actions">
          <a className="filter-button" href={`/decks/${deck.id}/download`}>
            Download PPTX
          </a>
          {deck.campaignId ? (
            <Link className="clear-button" href={`/campaigns/${deck.campaignId}`}>
              Open campaign
            </Link>
          ) : null}
        </div>
      </div>

      <div className="deck-preview">
        {deck.slides.map((slide, index) => (
          <article className={`deck-slide kind-${slide.kind}`} key={`${slide.heading}-${index}`}>
            <span>
              {index + 1} · {slide.kind}
            </span>
            <h2>{slide.heading}</h2>
            <ul>
              {slide.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            {slide.note ? <p>{slide.note}</p> : null}
          </article>
        ))}
      </div>
    </PortalShell>
  )
}
