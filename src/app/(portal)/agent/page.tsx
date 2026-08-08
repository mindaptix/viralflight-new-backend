import { PortalShell } from '../components/portal-shell'
import { requireSuperAdmin } from '../lib/auth'
import { AgentChat } from './agent-chat'

export const dynamic = 'force-dynamic'

export default async function AgentPage() {
  const user = await requireSuperAdmin()

  return (
    <PortalShell active="agent" user={user}>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Ask anything</p>
          <h1>Find creators instantly</h1>
          <p>
            Same Viral Flight creators database — filter by city, niche, followers and budget
            in plain English.
          </p>
        </div>
        <span className="live-badge">
          <i className="live-dot" />
          Live CRM data
        </span>
      </div>
      <AgentChat />
    </PortalShell>
  )
}
