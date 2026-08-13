import { PortalShell } from '../../components/portal-shell'
import { requireSuperAdmin } from '../../lib/auth'
import { createCampaignAction } from '../actions'
import { CampaignEditor } from '../campaign-editor'

export const dynamic = 'force-dynamic'

export default async function NewCampaignPage() {
  const user = await requireSuperAdmin()
  return (
    <PortalShell active="campaigns" user={user}>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">New campaign</p>
          <h1>Create a Viral Flight campaign</h1>
          <p>Ask Claude or OpenAI to draft copy, then edit and save.</p>
        </div>
      </div>
      <CampaignEditor action={createCampaignAction} submitLabel="Create campaign" />
    </PortalShell>
  )
}
