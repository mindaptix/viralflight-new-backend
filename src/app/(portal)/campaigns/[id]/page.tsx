import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PortalShell } from '../../components/portal-shell'
import { requireSuperAdmin } from '../../lib/auth'
import { formatDate, formatDateTime, formatNumber } from '../../lib/format'
import {
  dropCreatorAction,
  refreshStatsAction,
  reviewScriptAction,
  reviewVideoAction,
  saveInviteEmailAction,
  updateCampaignAction,
} from '../actions'
import { CampaignEditor } from '../campaign-editor'
import { STATUS_LABEL } from '../constants'
import {
  listAssignments,
  getVfCampaign,
  mailtoInviteUrl,
  whatsappInviteUrl,
} from '../data'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function CampaignDetailPage({ params }: PageProps) {
  const user = await requireSuperAdmin()
  const { id } = await params
  const campaign = await getVfCampaign(id)
  if (!campaign) notFound()
  const assignments = await listAssignments(id)
  const active = assignments.filter((row) => row.status !== 'dropped')
  const live = active.filter((row) => row.status === 'live')

  return (
    <PortalShell active="campaigns" user={user}>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">
            <Link href="/campaigns">← Campaigns</Link>
          </p>
          <h1>{campaign.title}</h1>
          <p>
            {campaign.clientName || 'Internal'} · {active.length}/{campaign.slotsNeeded} creators ·{' '}
            {live.length} live
          </p>
        </div>
        <div className="heading-actions">
          <Link className="filter-button" href={`/campaigns/${campaign.id}/creators`}>
            Select influencers
          </Link>
          <Link className="clear-button" href={`/decks?campaignId=${campaign.id}`}>
            Client PPT
          </Link>
          <a className="clear-button" href={campaign.clientUrl} rel="noreferrer" target="_blank">
            Client live link
          </a>
        </div>
      </div>

      <section className="detail-grid">
        <div className="detail-stack">
          <article className="panel">
            <div className="panel-header">
              <h2>Share</h2>
              <span>Client + creator links</span>
            </div>
            <div className="detail-kv">
              <div>
                <span>Client live dashboard</span>
                <strong>
                  <a href={campaign.clientUrl} rel="noreferrer" target="_blank">
                    {campaign.clientUrl}
                  </a>
                </strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{campaign.status}</strong>
              </div>
            </div>
          </article>

          {active.map((row) => (
            <article className="panel" key={row.id}>
              <div className="panel-header">
                <h2>{row.name}</h2>
                <span className="role-badge">{STATUS_LABEL[row.status]}</span>
              </div>
              <div className="detail-kv">
                <div><span>City</span><strong>{row.city || '—'}</strong></div>
                <div><span>Mobile</span><strong>{row.mobile || '—'}</strong></div>
                <div>
                  <span>Creator workspace</span>
                  <strong>
                    <a href={row.inviteUrl} rel="noreferrer" target="_blank">{row.inviteUrl}</a>
                  </strong>
                </div>
                <div>
                  <span>Video deadline</span>
                  <strong>{formatDate(row.videoDeadline || campaign.videoDeadline)}</strong>
                </div>
              </div>
              <div className="chip-row">
                {whatsappInviteUrl(row, campaign.title) ? (
                  <a className="chip" href={whatsappInviteUrl(row, campaign.title)} rel="noreferrer" target="_blank">
                    WhatsApp invite
                  </a>
                ) : null}
                <a className="chip soft" href={mailtoInviteUrl(row, campaign.title)}>
                  Email invite
                </a>
              </div>
              <form action={saveInviteEmailAction} className="note-form">
                <input name="campaignId" type="hidden" value={campaign.id} />
                <input name="assignmentId" type="hidden" value={row.id} />
                <label>
                  Invite email (optional)
                  <input defaultValue={row.inviteEmail} name="inviteEmail" placeholder="creator@email.com" type="email" />
                </label>
                <button className="clear-button" type="submit">Save email</button>
              </form>

              {row.scriptText ? (
                <div className="detail-bio">
                  <strong>Script</strong>
                  <p>{row.scriptText}</p>
                </div>
              ) : null}
              {row.scriptFeedback ? <p className="settings-help">Last script note: {row.scriptFeedback}</p> : null}

              {row.status === 'script_submitted' || row.status === 'script_changes' ? (
                <form action={reviewScriptAction} className="note-form">
                  <input name="campaignId" type="hidden" value={campaign.id} />
                  <input name="assignmentId" type="hidden" value={row.id} />
                  <label>
                    Feedback
                    <textarea name="feedback" placeholder="Approve or request changes…" rows={2} />
                  </label>
                  <label>
                    Video deadline
                    <input defaultValue={(row.videoDeadline || campaign.videoDeadline).slice(0, 10)} name="videoDeadline" type="date" />
                  </label>
                  <div className="settings-actions">
                    <button className="filter-button" name="decision" type="submit" value="approve">
                      Approve script
                    </button>
                    <button className="clear-button" name="decision" type="submit" value="changes">
                      Request changes
                    </button>
                  </div>
                </form>
              ) : null}

              {row.videoUrl ? (
                <p className="detail-bio">
                  Video: <a href={row.videoUrl} rel="noreferrer" target="_blank">{row.videoUrl}</a>
                </p>
              ) : null}

              {row.status === 'video_submitted' || row.status === 'video_changes' ? (
                <form action={reviewVideoAction} className="note-form">
                  <input name="campaignId" type="hidden" value={campaign.id} />
                  <input name="assignmentId" type="hidden" value={row.id} />
                  <label>
                    Feedback
                    <textarea name="feedback" placeholder="Approve or request video changes…" rows={2} />
                  </label>
                  <div className="settings-actions">
                    <button className="filter-button" name="decision" type="submit" value="approve">
                      Approve video
                    </button>
                    <button className="clear-button" name="decision" type="submit" value="changes">
                      Request changes
                    </button>
                  </div>
                </form>
              ) : null}

              {row.instagramUrl ? (
                <div className="detail-bio">
                  <p>
                    Instagram:{' '}
                    <a href={row.instagramUrl} rel="noreferrer" target="_blank">{row.instagramUrl}</a>
                  </p>
                  <p>
                    {formatNumber(row.stats?.views || 0)} views · {formatNumber(row.stats?.likes || 0)} likes ·{' '}
                    {formatNumber(row.stats?.comments || 0)} comments
                    {row.stats?.fetchedAt ? ` · ${formatDateTime(row.stats.fetchedAt)}` : ''}
                  </p>
                  {row.stats?.note ? <span className="settings-help">{row.stats.note}</span> : null}
                  <form action={refreshStatsAction}>
                    <input name="campaignId" type="hidden" value={campaign.id} />
                    <input name="assignmentId" type="hidden" value={row.id} />
                    <button className="clear-button" type="submit">Refresh live stats</button>
                  </form>
                </div>
              ) : null}

              <form action={dropCreatorAction} className="note-form">
                <input name="campaignId" type="hidden" value={campaign.id} />
                <input name="assignmentId" type="hidden" value={row.id} />
                <button className="clear-button" type="submit">Drop creator</button>
              </form>
            </article>
          ))}
          {!active.length ? (
            <div className="empty-state">No creators selected yet.</div>
          ) : null}
        </div>

        <aside className="detail-side">
          <CampaignEditor
            action={updateCampaignAction}
            extraFields={
              <>
                <input name="campaignId" type="hidden" value={campaign.id} />
                <label>
                  Pipeline status
                  <select defaultValue={campaign.status} name="status">
                    <option value="draft">draft</option>
                    <option value="active">active</option>
                    <option value="in_review">in_review</option>
                    <option value="live">live</option>
                    <option value="completed">completed</option>
                    <option value="archived">archived</option>
                  </select>
                </label>
              </>
            }
            initial={{
              title: campaign.title,
              clientName: campaign.clientName,
              brandName: campaign.brandName,
              description: campaign.description,
              brief: campaign.brief,
              category: campaign.category,
              scriptGuidelines: campaign.scriptGuidelines,
              deliverable: campaign.deliverable,
              slotsNeeded: String(campaign.slotsNeeded),
              budgetAmount: String(campaign.budgetAmount || ''),
              location: campaign.location,
              scriptDeadline: campaign.scriptDeadline,
              videoDeadline: campaign.videoDeadline,
            }}
            submitLabel="Save campaign"
          />
        </aside>
      </section>
    </PortalShell>
  )
}
