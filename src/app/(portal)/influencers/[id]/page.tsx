import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Avatar } from '../../components/avatar'
import { PortalShell } from '../../components/portal-shell'
import { BrandWorkPanel } from '../../crm/brand-work-panel'
import { addNoteAction, saveCrmMetaAction } from '../../crm/actions'
import { getInfluencerDetail, listStaffMembers } from '../../crm/data'
import { getInfluencerIntel } from '../../crm/intel'
import { listVfWorkForInfluencer } from '../../campaigns/data'
import { requireSuperAdmin } from '../../lib/auth'
import { CRM_STATUSES, formatDate, formatDateTime, formatNumber } from '../../lib/format'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function InfluencerDetailPage({ params }: PageProps) {
  const user = await requireSuperAdmin()
  const { id } = await params
  const [profile, staff, intel, vfWork] = await Promise.all([
    getInfluencerDetail(id),
    listStaffMembers(),
    getInfluencerIntel(id),
    listVfWorkForInfluencer(id),
  ])
  if (!profile) notFound()

  const ig =
    profile.instagram && typeof profile.instagram === 'object'
      ? (profile.instagram as Record<string, unknown>)
      : {}
  const assignee = staff.find((member) => member.id === profile.crm.assigneeId)?.name || 'Unassigned'

  return (
    <PortalShell active="influencers" user={user}>
      <section className="creator-detail-hero">
        <Link className="creator-back-link" href="/influencers">← Creator directory</Link>
        <div className="creator-hero-main">
          <div className="creator-identity">
            <Avatar name={profile.name} size="lg" src={profile.profileImageUrl} />
            <div>
              <span className="creator-kicker">Creator profile</span>
              <h1>{profile.name}</h1>
              <p>{profile.profession || 'Creator'} · {profile.city || 'City not set'}</p>
            </div>
          </div>
          <span className={`creator-status ${profile.complete ? 'complete' : 'incomplete'}`}>
            {profile.complete ? '✓ Profile complete' : 'Profile incomplete'}
          </span>
        </div>
        <div className="creator-hero-stats">
          <div><span>Audience</span><strong>{formatNumber(profile.followers)}</strong><small>Total followers</small></div>
          <div><span>Platforms</span><strong>{profile.platforms.length}</strong><small>Connected accounts</small></div>
          <div><span>Brand work</span><strong>{vfWork.length}</strong><small>ViralFlight campaigns</small></div>
          <div><span>CRM stage</span><strong>{profile.crm.status}</strong><small>{assignee}</small></div>
        </div>
      </section>

      <section className="detail-grid creator-detail-grid">
        <div className="detail-stack">
          <article className="panel creator-profile-card">
            <div className="panel-header">
              <div><span className="panel-kicker">Creator overview</span><h2>Profile details</h2></div>
              <span>Joined {formatDate(profile.createdAt)}</span>
            </div>
            <div className="detail-kv">
              <div><span>Profession</span><strong>{profile.profession || '—'}</strong></div>
              <div><span>City</span><strong>{profile.city || '—'}</strong></div>
              <div><span>Mobile</span><strong>{profile.mobile || '—'}</strong></div>
              <div><span>Collab prefs</span><strong>{profile.collaborationPreference || '—'}</strong></div>
              <div><span>Manager</span><strong>{profile.managerName || '—'}</strong></div>
              <div><span>Manager WhatsApp</span><strong>{profile.managerMobile || '—'}</strong></div>
              <div><span>YouTube</span><strong>{profile.youtubeHandle || '—'}</strong></div>
              <div>
                <span>Portfolio</span>
                <strong>
                  {profile.portfolioLink ? (
                    <a href={profile.portfolioLink} rel="noreferrer" target="_blank">
                      Open link
                    </a>
                  ) : (
                    '—'
                  )}
                </strong>
              </div>
            </div>
            {profile.bio ? <p className="detail-bio">{profile.bio}</p> : null}
            <div className="chip-row">
              {profile.niches.map((item) => (
                <span className="chip" key={item}>{item}</span>
              ))}
              {profile.languages.map((item) => (
                <span className="chip soft" key={`lang-${item}`}>{item}</span>
              ))}
            </div>
          </article>

          <BrandWorkPanel intel={intel} profileId={profile.id} vfWork={vfWork} />

          <article className="panel">
            <div className="panel-header">
              <h2>Platforms</h2>
              <span>
                Instagram {ig.isConnected ? 'connected' : 'not connected'}
              </span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Handle</th>
                    <th>Followers</th>
                    <th>Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.platforms as Array<Record<string, unknown>>).map((platform, index) => (
                    <tr key={`${platform.platform}-${index}`}>
                      <td>{String(platform.platform || '—')}</td>
                      <td>{String(platform.username || platform.channelName || '—')}</td>
                      <td>
                        {formatNumber(Number(platform.followers ?? platform.subscribers ?? 0))}
                      </td>
                      <td>{String(platform.engagement ?? '—')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!profile.platforms.length ? (
                <div className="empty-state">No platforms listed yet.</div>
              ) : null}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <h2>Notes</h2>
              <span>{profile.crm.notes.length} entries</span>
            </div>
            <form action={addNoteAction} className="note-form">
              <input name="profileId" type="hidden" value={profile.id} />
              <input name="role" type="hidden" value="influencer" />
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
          <article className="panel sticky-panel creator-crm-card">
            <div className="panel-header">
              <h2>CRM controls</h2>
              <span>Internal only</span>
            </div>
            <form action={saveCrmMetaAction} className="crm-form">
              <input name="profileId" type="hidden" value={profile.id} />
              <input name="role" type="hidden" value="influencer" />
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
                  placeholder="vip, beauty, mumbai"
                />
              </label>
              <button className="primary-button" type="submit">
                Save CRM fields
              </button>
            </form>
            {profile.crm.tags.length ? (
              <div className="chip-row">
                {profile.crm.tags.map((tag) => (
                  <span className="chip" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        </aside>
      </section>
    </PortalShell>
  )
}
