import { notFound } from 'next/navigation'

import {
  publicSubmitInstagramAction,
  publicSubmitScriptAction,
  publicSubmitVideoAction,
} from '../../campaigns/public-actions'
import { STATUS_LABEL } from '../../campaigns/constants'
import { getAssignmentByInvite } from '../../campaigns/data'
import { formatDate } from '../../lib/format'
import { Brand } from '../../components/portal-shell'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ token: string }>
}

export default async function InfluencerWorkspacePage({ params }: PageProps) {
  const { token } = await params
  const found = await getAssignmentByInvite(token)
  if (!found) notFound()
  const { assignment, campaign } = found
  const scriptOpen = assignment.status === 'invited' || assignment.status === 'script_changes'
  const videoOpen = assignment.status === 'script_approved' || assignment.status === 'video_changes'
  const igOpen = assignment.status === 'video_approved' || assignment.status === 'live'

  return (
    <main className="public-page">
      <header className="public-top">
        <Brand />
        <span className="role-badge">{STATUS_LABEL[assignment.status]}</span>
      </header>
      <section className="public-card">
        <p className="eyebrow">Creator workspace</p>
        <h1>{campaign.title}</h1>
        <p>
          Hi {assignment.name}. {campaign.clientName ? `Client: ${campaign.clientName}.` : ''}{' '}
          Deliverable: {campaign.deliverable}.
        </p>
        {campaign.description ? <p className="detail-bio">{campaign.description}</p> : null}
        {campaign.scriptGuidelines ? (
          <div className="public-block">
            <h2>Script guidelines</h2>
            <p>{campaign.scriptGuidelines}</p>
          </div>
        ) : null}

        <div className="public-block">
          <h2>1. Script</h2>
          {assignment.scriptFeedback ? <p className="form-error">Changes requested: {assignment.scriptFeedback}</p> : null}
          {scriptOpen ? (
            <form action={publicSubmitScriptAction} className="crm-form">
              <input name="inviteToken" type="hidden" value={token} />
              <textarea
                defaultValue={assignment.scriptText}
                name="scriptText"
                placeholder="Paste your reel script…"
                required
                rows={8}
              />
              <button className="primary-button" type="submit">Submit script</button>
            </form>
          ) : (
            <p>{assignment.scriptText || 'Waiting for script.'}</p>
          )}
        </div>

        <div className="public-block">
          <h2>2. Video</h2>
          <p>Deadline: {formatDate(assignment.videoDeadline || campaign.videoDeadline)}</p>
          {assignment.videoFeedback ? <p className="form-error">Changes requested: {assignment.videoFeedback}</p> : null}
          {videoOpen ? (
            <form action={publicSubmitVideoAction} className="crm-form">
              <input name="inviteToken" type="hidden" value={token} />
              <input
                defaultValue={assignment.videoUrl}
                name="videoUrl"
                placeholder="https://drive.google.com/… or any video link"
                required
                type="url"
              />
              <button className="primary-button" type="submit">Submit video</button>
            </form>
          ) : (
            <p>{assignment.videoUrl || 'Unlocks after script approval.'}</p>
          )}
        </div>

        <div className="public-block">
          <h2>3. Instagram live link</h2>
          {igOpen ? (
            <form action={publicSubmitInstagramAction} className="crm-form">
              <input name="inviteToken" type="hidden" value={token} />
              <input
                defaultValue={assignment.instagramUrl}
                name="instagramUrl"
                placeholder="https://www.instagram.com/reel/…"
                required
                type="url"
              />
              <button className="primary-button" type="submit">Share Instagram link</button>
            </form>
          ) : (
            <p>Unlocks after Viral Flight approves your video.</p>
          )}
        </div>
      </section>
    </main>
  )
}
