import { PortalShell } from '../components/portal-shell'
import { requireSuperAdmin } from '../lib/auth'
import { formatDateTime } from '../lib/format'
import { saveAiSettingsAction } from '../crm/settings-actions'
import { getCrmSettingsPublic } from '../crm/settings'

export const dynamic = 'force-dynamic'

const MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1']

export default async function SettingsPage() {
  const user = await requireSuperAdmin()
  const settings = await getCrmSettingsPublic()

  return (
    <PortalShell active="settings" user={user}>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Company CRM</p>
          <h1>Settings</h1>
          <p>Manage AI agent credentials used across the Viral Flight company portal.</p>
        </div>
        <span className={`status-badge ${settings.hasOpenAiKey ? 'complete' : 'incomplete'}`}>
          {settings.hasOpenAiKey ? `Key ready · ${settings.source}` : 'No API key'}
        </span>
      </div>

      <section className="settings-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>OpenAI</h2>
            <span>Used by AI Agent</span>
          </div>

          <form action={saveAiSettingsAction} className="crm-form settings-form">
            <label>
              API key
              <input
                autoComplete="off"
                name="openaiApiKey"
                placeholder={
                  settings.hasOpenAiKey
                    ? `Saved: ${settings.openaiKeyHint} — paste new key to replace`
                    : 'sk-...'
                }
                type="password"
              />
            </label>
            <p className="settings-help">
              Key is encrypted in the database. Leave blank to keep the current key.
              {settings.source === 'env'
                ? ' Right now the agent is using the server .env key until you save one here.'
                : null}
            </p>

            <label>
              Model
              <select defaultValue={settings.openaiModel} name="openaiModel">
                {MODELS.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </label>

            <div className="settings-actions">
              <button className="primary-button" type="submit">
                Save settings
              </button>
              {settings.source === 'crm' ? (
                <button
                  className="clear-button"
                  formAction={saveAiSettingsAction}
                  name="clearKey"
                  type="submit"
                  value="1"
                >
                  Remove CRM key
                </button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Status</h2>
            <span>Current source</span>
          </div>
          <div className="detail-kv">
            <div>
              <span>Key status</span>
              <strong>{settings.hasOpenAiKey ? 'Configured' : 'Missing'}</strong>
            </div>
            <div>
              <span>Active source</span>
              <strong>
                {settings.source === 'crm'
                  ? 'CRM Settings'
                  : settings.source === 'env'
                    ? 'Server .env'
                    : 'None'}
              </strong>
            </div>
            <div>
              <span>Masked key</span>
              <strong>{settings.openaiKeyHint || '—'}</strong>
            </div>
            <div>
              <span>Model</span>
              <strong>{settings.openaiModel}</strong>
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
