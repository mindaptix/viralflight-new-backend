import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PortalShell } from '../../components/portal-shell'
import { addNoteAction, saveCrmMetaAction } from '../../crm/actions'
import { getAgencyDetail, listStaffMembers } from '../../crm/data'
import { requireSuperAdmin } from '../../lib/auth'
import { CRM_STATUSES, formatDate, formatDateTime } from '../../lib/format'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function AgencyDetailPage({ params }: PageProps) {
  const user = await requireSuperAdmin()
  const { id } = await params
  const [profile, staff] = await Promise.all([
    getAgencyDetail(id),
    listStaffMembers(),
  ])
  if (!profile) notFound()

  return (
    <PortalShell active="agencies" user={user}>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">
            <Link href="/agencies">← Agencies</Link>
          </p>
          <h1>{profile.name}</h1>
          <p>
            {profile.city || 'City not set'} · {profile.mobile || 'No mobile'} · Joined{' '}
            {formatDate(profile.createdAt)}
          </p>
        </div>
        <span className={`status-badge ${profile.complete ? 'complete' : 'incomplete'}`}>
          {profile.complete ? 'Profile complete' : 'Incomplete'}
        </span>
      </div>

      <section className="detail-grid">
        <div className="detail-stack">
          <article className="panel">
            <div className="panel-header">
              <h2>Agency profile</h2>
              <span>{profile.agencyType || 'Type not set'}</span>
            </div>
            <div className="detail-kv">
              <div><span>Contact person</span><strong>{profile.contactPerson || '—'}</strong></div>
              <div><span>Mobile</span><strong>{profile.mobile || '—'}</strong></div>
              <div><span>City</span><strong>{profile.city || '—'}</strong></div>
              <div><span>Team size</span><strong>{profile.teamSize || '—'}</strong></div>
              <div><span>Creators managed</span><strong>{profile.creatorsManaged || '—'}</strong></div>
              <div>
                <span>Website</span>
                <strong>
                  {profile.website ? (
                    <a href={profile.website} rel="noreferrer" target="_blank">
                      {profile.website}
                    </a>
                  ) : (
                    '—'
                  )}
                </strong>
              </div>
            </div>
            {profile.bio ? <p className="detail-bio">{profile.bio}</p> : null}
            <div className="chip-row">
              {profile.focusAreas.map((item) => (
                <span className="chip" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <h2>Notes</h2>
              <span>{profile.crm.notes.length} entries</span>
            </div>
            <form action={addNoteAction} className="note-form">
              <input name="profileId" type="hidden" value={profile.id} />
              <input name="role" type="hidden" value="agency" />
              <textarea
                name="text"
                placeholder="Add an internal note for the team…"
                required
                rows={3}
              />
              <button className="filter-button" type="submit">
                Add note
              </button>
            </form>
            <ul className="note-list">
              {profile.crm.notes.map((note) => (
                <li key={note.id}>
                  <div>
                    <strong>{note.authorName}</strong>
                    <span>{formatDateTime(note.createdAt)}</span>
                  </div>
                  <p>{note.text}</p>
                </li>
              ))}
            </ul>
            {!profile.crm.notes.length ? (
              <div className="empty-state">No notes yet.</div>
            ) : null}
          </article>
        </div>

        <aside className="detail-side">
          <article className="panel sticky-panel">
            <div className="panel-header">
              <h2>CRM controls</h2>
              <span>Internal only</span>
            </div>
            <form action={saveCrmMetaAction} className="crm-form">
              <input name="profileId" type="hidden" value={profile.id} />
              <input name="role" type="hidden" value="agency" />
              <label>
                Pipeline status
                <select defaultValue={profile.crm.status} name="status">
                  {CRM_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Assign staff
                <select defaultValue={profile.crm.assigneeId} name="assigneeId">
                  <option value="">Unassigned</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tags (comma separated)
                <input
                  defaultValue={profile.crm.tags.join(', ')}
                  name="tags"
                  placeholder="priority, north, talent"
                />
              </label>
              <button className="primary-button" type="submit">
                Save CRM fields
              </button>
            </form>
          </article>
        </aside>
      </section>
    </PortalShell>
  )
}
