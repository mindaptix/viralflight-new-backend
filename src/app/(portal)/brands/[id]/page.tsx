import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Avatar } from '../../components/avatar'
import { PortalShell } from '../../components/portal-shell'
import { addNoteAction, saveCrmMetaAction } from '../../crm/actions'
import { getBrandDetail, listStaffMembers } from '../../crm/data'
import { requireSuperAdmin } from '../../lib/auth'
import { CRM_STATUSES, formatDate, formatDateTime } from '../../lib/format'

export const dynamic = 'force-dynamic'

export default async function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSuperAdmin()
  const { id } = await params
  const [profile, staff] = await Promise.all([getBrandDetail(id), listStaffMembers()])
  if (!profile) notFound()
  const assignee = staff.find((member) => member.id === profile.crm.assigneeId)?.name || 'Unassigned'

  return (
    <PortalShell active="users" user={user}>
      <section className="creator-detail-hero brand-detail-hero">
        <Link className="creator-back-link" href="/users?role=brand">← Brand accounts</Link>
        <div className="creator-hero-main">
          <div className="creator-identity">
            <Avatar name={profile.name} size="lg" src={profile.profileImageUrl} />
            <div><span className="creator-kicker">Brand partner</span><h1>{profile.name}</h1><p>{profile.industry || 'Brand'} · {profile.city || 'City not set'}</p></div>
          </div>
          <span className={`creator-status ${profile.complete ? 'complete' : 'incomplete'}`}>{profile.complete ? '✓ Profile complete' : 'Profile incomplete'}</span>
        </div>
        <div className="creator-hero-stats">
          <div><span>Industry</span><strong>{profile.industry || '—'}</strong><small>Brand category</small></div>
          <div><span>Campaign interests</span><strong>{profile.campaignInterests.length}</strong><small>Preferred formats</small></div>
          <div><span>Monthly budget</span><strong>{profile.monthlyCampaignBudget || '—'}</strong><small>Campaign investment</small></div>
          <div><span>CRM stage</span><strong>{profile.crm.status}</strong><small>{assignee}</small></div>
        </div>
      </section>

      <section className="detail-grid creator-detail-grid">
        <div className="detail-stack">
          <article className="panel creator-profile-card">
            <div className="panel-header">
              <div><span className="panel-kicker">Partner overview</span><h2>Brand profile</h2></div>
              <span>Joined {formatDate(profile.createdAt)}</span>
            </div>
            <div className="detail-kv">
              <div><span>Contact person</span><strong>{profile.contactPerson || '—'}</strong></div>
              <div><span>Mobile</span><strong>{profile.mobile || '—'}</strong></div>
              <div><span>City</span><strong>{profile.city || '—'}</strong></div>
              <div><span>Industry</span><strong>{profile.industry || '—'}</strong></div>
              <div><span>Instagram</span><strong>{profile.instagramHandle || '—'}</strong></div>
              <div><span>Website</span><strong>{profile.website ? <a href={profile.website} rel="noreferrer" target="_blank">Open website</a> : '—'}</strong></div>
            </div>
            {profile.description ? <p className="detail-bio">{profile.description}</p> : null}
            <div className="chip-row">
              {profile.campaignInterests.map((item) => <span className="chip" key={item}>{item}</span>)}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header"><h2>Notes</h2><span>{profile.crm.notes.length} entries</span></div>
            <form action={addNoteAction} className="note-form">
              <input name="profileId" type="hidden" value={profile.id} />
              <input name="role" type="hidden" value="brand" />
              <textarea name="text" placeholder="Add an internal note for the team…" required rows={3} />
              <button className="filter-button" type="submit">Add note</button>
            </form>
            <ul className="note-list">
              {profile.crm.notes.map((note) => <li key={note.id}><div><strong>{note.authorName}</strong><span>{formatDateTime(note.createdAt)}</span></div><p>{note.text}</p></li>)}
            </ul>
            {!profile.crm.notes.length ? <div className="empty-state">No notes yet.</div> : null}
          </article>
        </div>

        <aside className="detail-side">
          <article className="panel sticky-panel creator-crm-card">
            <div className="panel-header"><h2>CRM controls</h2><span>Internal only</span></div>
            <form action={saveCrmMetaAction} className="crm-form">
              <input name="profileId" type="hidden" value={profile.id} />
              <input name="role" type="hidden" value="brand" />
              <label>Pipeline status<select defaultValue={profile.crm.status} name="status">{CRM_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <label>Assign staff<select defaultValue={profile.crm.assigneeId} name="assigneeId"><option value="">Unassigned</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
              <label>Tags (comma separated)<input defaultValue={profile.crm.tags.join(', ')} name="tags" placeholder="priority, beauty, launch" /></label>
              <button className="primary-button" type="submit">Save CRM fields</button>
            </form>
          </article>
        </aside>
      </section>
    </PortalShell>
  )
}
