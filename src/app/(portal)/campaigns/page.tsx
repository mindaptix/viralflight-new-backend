import Link from 'next/link'

import { PortalShell } from '../components/portal-shell'
import { requireSuperAdmin } from '../lib/auth'
import { formatDate, formatNumber } from '../lib/format'
import { listAssignments, listVfCampaigns } from './data'

export const dynamic = 'force-dynamic'

export default async function CampaignsPage() {
  const user = await requireSuperAdmin()
  const campaigns = await listVfCampaigns()
  const counts = await Promise.all(
    campaigns.map(async (campaign) => {
      const rows = await listAssignments(campaign.id)
      return [campaign.id, rows.filter((row) => row.status !== 'dropped').length] as const
    }),
  )
  const countMap = Object.fromEntries(counts)

  return (
    <PortalShell active="campaigns" user={user}>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Viral Flight campaigns</p>
          <h1>In-house campaigns</h1>
          <p>Create VF-owned campaigns, pick creators, review scripts/videos, share a live client link.</p>
        </div>
        <Link className="filter-button" href="/campaigns/new">
          New campaign
        </Link>
      </div>

      <article className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Client</th>
                <th>Slots</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td className="person-cell">
                    <strong>{campaign.title}</strong>
                    <span>{campaign.deliverable} · {campaign.location || 'Pan India'}</span>
                  </td>
                  <td>{campaign.clientName || campaign.brandName || '—'}</td>
                  <td>
                    {formatNumber(countMap[campaign.id] || 0)}/{formatNumber(campaign.slotsNeeded)}
                  </td>
                  <td>
                    <span className="role-badge">{campaign.status}</span>
                  </td>
                  <td>{formatDate(campaign.createdAt)}</td>
                  <td>
                    <Link className="table-link" href={`/campaigns/${campaign.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!campaigns.length ? (
            <div className="empty-state">No Viral Flight campaigns yet. Create the first one.</div>
          ) : null}
        </div>
      </article>
    </PortalShell>
  )
}
