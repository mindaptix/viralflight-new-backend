import Link from 'next/link'

import { PortalShell } from '../components/portal-shell'
import { getAgencyDashboard } from '../dashboard-home'
import { requireSuperAdmin } from '../lib/auth'

export const dynamic = 'force-dynamic'

export default async function ApprovalsPage() {
  const user = await requireSuperAdmin()
  const data = await getAgencyDashboard()

  return (
    <PortalShell active="approvals" user={user}>
      <article className="dash-card">
        <div className="dash-card-head">
          <h2>Approvals Queue</h2>
          <span>{data.approvals.length} waiting</span>
        </div>
        <ul className="queue-list">
          {data.approvals.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.kind}</strong>
                <span>
                  {item.campaignTitle} · {item.creatorName}
                </span>
                <em>{item.when}</em>
              </div>
              <Link className="review-btn" href={item.href}>
                Review
              </Link>
            </li>
          ))}
          {!data.approvals.length ? (
            <li className="empty-state">Nothing waiting for review.</li>
          ) : null}
        </ul>
      </article>
    </PortalShell>
  )
}
