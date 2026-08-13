import { PortalShell } from '../components/portal-shell'
import { getAgencyDashboard } from '../dashboard-home'
import { requireSuperAdmin } from '../lib/auth'
import { formatNumber } from '../lib/format'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const user = await requireSuperAdmin()
  const data = await getAgencyDashboard()

  return (
    <PortalShell active="reports" user={user}>
      <section className="dash-metrics">
        <article>
          <span>Reach</span>
          <strong>{formatNumber(data.performance.reach)}</strong>
        </article>
        <article>
          <span>Views</span>
          <strong>{formatNumber(data.performance.views)}</strong>
        </article>
        <article>
          <span>Engagement</span>
          <strong>{data.performance.engagement}%</strong>
        </article>
        <article>
          <span>Likes</span>
          <strong>{formatNumber(data.performance.likes)}</strong>
        </article>
      </section>
      <article className="dash-card">
        <div className="dash-card-head">
          <h2>Campaign snapshot</h2>
          <span>From live Instagram stats</span>
        </div>
        <div className="table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Client</th>
                <th>Views</th>
                <th>Reach</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((row) => (
                <tr key={row.id}>
                  <td>{row.title}</td>
                  <td>{row.client}</td>
                  <td>{formatNumber(row.stats.views)}</td>
                  <td>{formatNumber(row.stats.reach)}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </PortalShell>
  )
}
