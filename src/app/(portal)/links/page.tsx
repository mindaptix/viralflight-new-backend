import { PortalShell } from '../components/portal-shell'
import { getAgencyDashboard } from '../dashboard-home'
import { requireSuperAdmin } from '../lib/auth'

export const dynamic = 'force-dynamic'

export default async function ClientLinksPage() {
  const user = await requireSuperAdmin()
  const data = await getAgencyDashboard()

  return (
    <PortalShell active="links" user={user}>
      <article className="dash-card">
        <div className="dash-card-head">
          <h2>Client Live Links</h2>
          <span>Share these with brands</span>
        </div>
        <ul className="link-list">
          {data.clientLinks.map((item) => (
            <li key={item.id}>
              <strong>{item.client}</strong>
              <a href={item.url} rel="noreferrer" target="_blank">
                {item.url}
              </a>
            </li>
          ))}
          {!data.clientLinks.length ? (
            <li className="empty-state">No live links yet. Create a campaign first.</li>
          ) : null}
        </ul>
      </article>
    </PortalShell>
  )
}
