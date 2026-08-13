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
        <span className={`status-badge ${settings.hasOpenAiKey || settings.hasClaudeKey ? 'complete' : 'incomplete'}`}>
          {settings.hasClaudeKey || settings.hasOpenAiKey ? 'AI keys ready' : 'No API key'}
        </span>
      </div>

      <section className="settings-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Claude</h2>
            <span>Campaign copy</span>
          </div>
          <form action={saveAiSettingsAction} className="crm-form settings-form">
            <input name="openaiModel" type="hidden" value={settings.openaiModel} />
            <label>
              Anthropic API key
              <input
                autoComplete="off"
                name="claudeApiKey"
                placeholder={
                  settings.hasClaudeKey
                    ? `Saved: ${settings.claudeKeyHint} — paste new key to replace`
                    : 'sk-ant-...'
                }
                type="password"
              />
            </label>
            <label>
              Claude model
              <select defaultValue={settings.claudeModel} name="claudeModel">
                <option value="claude-sonnet-4-5">claude-sonnet-4-5</option>
                <option value="claude-opus-4-5">claude-opus-4-5</option>
                <option value="claude-3-5-haiku-latest">claude-3-5-haiku-latest</option>
              </select>
            </label>
            <div className="settings-actions">
              <button className="primary-button" type="submit">Save Claude</button>
              {settings.hasClaudeKey && settings.claudeKeyHint && !settings.claudeKeyHint.includes('.env') ? (
                <button className="clear-button" name="clearClaudeKey" type="submit" value="1">
                  Remove Claude key
                </button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>OpenAI</h2>
            <span>Used by AI Agent + fallback</span>
          </div>

          <form action={saveAiSettingsAction} className="crm-form settings-form">
            <input name="claudeModel" type="hidden" value={settings.claudeModel} />
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
              <span>Claude</span>
              <strong>{settings.hasClaudeKey ? settings.claudeKeyHint : 'Missing'}</strong>
            </div>
            <div>
              <span>OpenAI</span>
              <strong>{settings.hasOpenAiKey ? settings.openaiKeyHint : 'Missing'}</strong>
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
