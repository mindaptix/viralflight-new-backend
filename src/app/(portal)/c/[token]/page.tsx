import { notFound } from 'next/navigation'

import { STATUS_LABEL } from '../../campaigns/constants'
import { getVfCampaignByClientToken, listAssignments } from '../../campaigns/data'
import { Brand } from '../../components/portal-shell'
import { formatDateTime, formatNumber } from '../../lib/format'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ token: string }>
}

export default async function ClientLivePage({ params }: PageProps) {
  const { token } = await params
  const campaign = await getVfCampaignByClientToken(token)
  if (!campaign) notFound()
  const rows = (await listAssignments(campaign.id)).filter((row) => row.status !== 'dropped')
  const live = rows.filter((row) => row.instagramUrl)
  const totals = live.reduce(
    (sum, row) => ({
      views: sum.views + (row.stats?.views || 0),
      likes: sum.likes + (row.stats?.likes || 0),
      comments: sum.comments + (row.stats?.comments || 0),
    }),
    { views: 0, likes: 0, comments: 0 },
  )

  return (
    <main className="public-page">
      <header className="public-top">
        <Brand />
        <span className="live-badge">
          <i className="live-dot" />
          Client live view
        </span>
      </header>
      <section className="public-card">
        <p className="eyebrow">{campaign.clientName || 'Campaign'}</p>
        <h1>{campaign.title}</h1>
        <p>{campaign.description}</p>
        <div className="metric-grid" style={{ marginTop: 24 }}>
          <article className="metric-card">
            <span>Creators</span>
            <strong>{formatNumber(rows.length)}</strong>
          </article>
          <article className="metric-card">
            <span>Live reels</span>
            <strong>{formatNumber(live.length)}</strong>
          </article>
          <article className="metric-card">
            <span>Views</span>
            <strong>{formatNumber(totals.views)}</strong>
          </article>
          <article className="metric-card">
            <span>Likes</span>
            <strong>{formatNumber(totals.likes)}</strong>
          </article>
        </div>
      </section>

      <article className="panel" style={{ marginTop: 18 }}>
        <div className="panel-header">
          <h2>Deliverables</h2>
          <span>{campaign.deliverable}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Creator</th>
                <th>Stage</th>
                <th>Views</th>
                <th>Likes</th>
                <th>Comments</th>
                <th>Reel</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="person-cell">
                    <strong>{row.name}</strong>
                    <span>{row.city || '—'}</span>
                  </td>
                  <td>
                    <span className="role-badge">{STATUS_LABEL[row.status]}</span>
                  </td>
                  <td>{formatNumber(row.stats?.views || 0)}</td>
                  <td>{formatNumber(row.stats?.likes || 0)}</td>
                  <td>{formatNumber(row.stats?.comments || 0)}</td>
                  <td>
                    {row.instagramUrl ? (
                      <a className="table-link" href={row.instagramUrl} rel="noreferrer" target="_blank">
                        Open
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? <div className="empty-state">Creators will appear here once selected.</div> : null}
        </div>
        {live[0]?.stats?.fetchedAt ? (
          <p className="settings-help" style={{ padding: '0 20px 16px' }}>
            Last stats refresh {formatDateTime(live[0].stats.fetchedAt)}. Totals depend on connected Instagram Graph data.
          </p>
        ) : null}
      </article>
    </main>
  )
}
