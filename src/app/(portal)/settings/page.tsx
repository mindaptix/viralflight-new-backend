import { PortalShell } from '../components/portal-shell'
import { requireSuperAdmin } from '../lib/auth'
import { formatDateTime } from '../lib/format'
import { saveAiSettingsAction } from '../crm/settings-actions'
import { getCrmSettingsPublic } from '../crm/settings'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await requireSuperAdmin()
  const settings = await getCrmSettingsPublic()
  const ready = settings.hasOpenAiKey || settings.hasClaudeKey

  return (
    <PortalShell active="settings" user={user}>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Company CRM</p>
          <h1>Settings</h1>
          <p>Connect AI so Viral Flight can write decks, briefs, and search the CRM.</p>
        </div>
        <span className={`status-badge ${ready ? 'complete' : 'incomplete'}`}>
          {ready ? 'AI ready' : 'AI not connected'}
        </span>
      </div>

      <section className="settings-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>AI</h2>
            <span>Models are chosen automatically</span>
          </div>
          <form action={saveAiSettingsAction} className="crm-form settings-form">
            <label>
              Creative key
              <input
                autoComplete="off"
                name="claudeApiKey"
                placeholder={
                  settings.hasClaudeKey
                    ? 'Saved — paste a new key to replace'
                    : 'Used for copy, briefs and client PPT'
                }
                type="password"
              />
            </label>
            <label>
              Operations key
              <input
                autoComplete="off"
                name="openaiApiKey"
                placeholder={
                  settings.hasOpenAiKey
                    ? 'Saved — paste a new key to replace'
                    : 'Used for search, filters and campaign logic'
                }
                type="password"
              />
            </label>
            <p className="settings-help">
              Keys are encrypted in the database. Leave a field blank to keep the current key.
            </p>
            <div className="settings-actions">
              <button className="primary-button" type="submit">
                Save AI
              </button>
              {settings.hasClaudeKey || settings.source === 'crm' ? (
                <button className="clear-button" name="clearAllKeys" type="submit" value="1">
                  Disconnect AI
                </button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Status</h2>
            <span>Connection</span>
          </div>
          <div className="detail-kv">
            <div>
              <span>Creative AI</span>
              <strong>{settings.hasClaudeKey ? 'Connected' : 'Not connected'}</strong>
            </div>
            <div>
              <span>Operations AI</span>
              <strong>{settings.hasOpenAiKey ? 'Connected' : 'Not connected'}</strong>
            </div>
            <div>
              <span>Last updated</span>
              <strong>{settings.updatedAt ? formatDateTime(settings.updatedAt) : '—'}</strong>
            </div>
            <div>
              <span>Updated by</span>
              <strong>{settings.updatedBy || '—'}</strong>
            </div>
          </div>
        </article>
      </section>
    </PortalShell>
  )
}
