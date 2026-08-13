import Link from 'next/link'

import { PortalShell } from '../components/portal-shell'
import { listVfCampaigns } from '../campaigns/data'
import { requireSuperAdmin } from '../lib/auth'
import { firstParam, formatDate } from '../lib/format'
import { DeckForm } from './deck-form'
import { listClientDecks } from './data'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function DecksPage({ searchParams }: PageProps) {
  const user = await requireSuperAdmin()
  const params = await searchParams
  const campaignId = firstParam(params.campaignId)
  const [campaigns, decks] = await Promise.all([listVfCampaigns(), listClientDecks()])
  const selected = campaigns.find((item) => item.id === campaignId)

  return (
    <PortalShell active="decks" user={user}>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Client presentations</p>
          <h1>Client PPT</h1>
          <p>
            Generate a Viral Flight branded PowerPoint for a client with AI, then download and
            present.
          </p>
        </div>
      </div>

      <DeckForm
        campaigns={campaigns.map((campaign) => ({
          id: campaign.id,
          title: campaign.title,
          clientName: campaign.clientName || campaign.brandName,
        }))}
        defaultCampaignId={campaignId}
        defaultClientName={selected?.clientName || selected?.brandName || ''}
      />

      <article className="panel" style={{ marginTop: 16 }}>
        <div className="panel-header">
          <h2>Saved decks</h2>
          <span>{decks.length} files</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Deck</th>
                <th>Client</th>
                <th>Campaign</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {decks.map((deck) => (
                <tr key={deck.id}>
                  <td>
                    <strong>{deck.title}</strong>
                  </td>
                  <td>{deck.clientName || '—'}</td>
                  <td>{deck.campaignTitle || '—'}</td>
                  <td>{formatDate(deck.createdAt)}</td>
                  <td>
                    <Link className="table-link" href={`/decks/${deck.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!decks.length ? (
            <div className="empty-state">No client PPTs yet. Generate the first one above.</div>
          ) : null}
        </div>
      </article>
    </PortalShell>
  )
}
