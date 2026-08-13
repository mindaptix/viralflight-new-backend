import config from '@payload-config'
import { headers } from 'next/headers'
import Link from 'next/link'
import { getPayload } from 'payload'

import { LoginForm, LogoutButton } from './auth-controls'
import { Avatar } from './components/avatar'
import { InsightCharts } from './components/insight-charts'
import { PortalShell, Brand } from './components/portal-shell'
import { getAgencyDashboard } from './dashboard-home'
import { formatNumber } from './lib/format'

export const dynamic = 'force-dynamic'

function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-story">
        <Brand />
        <div className="story-copy">
          <p className="eyebrow">Super admin command centre</p>
          <h1>See every signal. Grow every connection.</h1>
          <p>
            Find influencers, filter creators, open full profiles, and manage agencies
            registered on Viral Flight.
          </p>
          <div className="story-points">
            <div className="story-point">
              <strong>Influencer CRM</strong>
              <span>Search, tags, notes and pipeline status</span>
            </div>
            <div className="story-point">
              <strong>Agency directory</strong>
              <span>Every agency that signed up on the app</span>
            </div>
            <div className="story-point">
              <strong>Operations</strong>
              <span>Monitor campaigns and applications</span>
            </div>
          </div>
        </div>
        <span className="login-footnote">Restricted access · Viral Flight operations</span>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <p className="eyebrow">Private portal</p>
          <h2>Welcome back</h2>
          <p>Sign in with your super admin account to open the CRM.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  )
}

function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`
  return formatNumber(value)
}

function statusClass(status: string) {
  if (status === 'Completed') return 'done'
  if (status === 'On Hold') return 'hold'
  return 'progress'
}

export default async function Page() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) return <LoginPage />

  if (user.role !== 'super_admin') {
    return (
      <main className="restricted">
        <Brand />
        <p className="eyebrow">Access restricted</p>
        <h1>Super admin access required</h1>
        <p>This account can use Payload Admin, but it cannot open the operations portal.</p>
        <LogoutButton />
      </main>
    )
  }

  const data = await getAgencyDashboard()
  const firstCampaign = data.campaigns[0]?.title || 'your next campaign'

  return (
    <PortalShell
      active="overview"
      user={{
        id: String(user.id),
        name: user.name,
        email: user.email,
        role: user.role,
      }}
    >
      <section className="dash-metrics">
        <article>
          <span>Live campaigns</span>
          <strong>{formatNumber(data.metrics.liveCampaigns)}</strong>
        </article>
        <article>
          <span>Active influencers</span>
          <strong>{formatNumber(data.metrics.influencers)}</strong>
        </article>
        <article>
          <span>Pending approvals</span>
          <strong>{formatNumber(data.metrics.pendingApprovals)}</strong>
        </article>
        <article>
          <span>Client live links</span>
          <strong>{formatNumber(data.metrics.clientLinks)}</strong>
        </article>
      </section>

      <InsightCharts
        pipeline={data.insights.pipeline}
        campaignViews={data.insights.campaignViews}
        cities={data.insights.cities}
        niches={data.insights.niches}
      />

      <div className="dash-grid">
        <article className="dash-card">
          <div className="dash-card-head">
            <h2>Active Campaigns</h2>
            <Link href="/campaigns">View all</Link>
          </div>
          {data.campaigns.length ? (
            <div className="table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Client</th>
                    <th>Deliverables</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Due date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.campaigns.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link className="campaign-cell" href={`/campaigns/${row.id}`}>
                          <span className="campaign-mark">◎</span>
                          <span>
                            <strong>{row.title}</strong>
                            <em>{row.reelsLabel}</em>
                          </span>
                        </Link>
                      </td>
                      <td>{row.client}</td>
                      <td>
                        {row.done}/{row.total}
                      </td>
                      <td>
                        <div className="progress-cell">
                          <span className="progress-track">
                            <i style={{ width: `${row.progress}%` }} />
                          </span>
                          {row.progress}%
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${statusClass(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td>{row.due}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              No campaigns yet.{' '}
              <Link href="/campaigns/new">Create Campaign +</Link>
            </div>
          )}
        </article>

        <aside className="dash-right">
          <article className="dash-card">
            <div className="dash-card-head">
              <h2>Influencer Shortlist</h2>
              <Link href="/influencers">Open</Link>
            </div>
            <ul className="shortlist">
              {data.shortlist.map((person) => (
                <li key={person.id}>
                  <Link href={`/influencers/${person.id}`}>
                    <Avatar name={person.name} src={person.photoUrl} />
                    <span>
                      <strong>{person.name}</strong>
                      <em>
                        {person.handle ? `@${person.handle}` : person.city || 'India'} ·{' '}
                        {compact(person.followers)} · {person.niche}
                      </em>
                    </span>
                    <b>{person.match} Match</b>
                  </Link>
                </li>
              ))}
              {!data.shortlist.length ? (
                <li className="empty-state">No influencers in the CRM yet.</li>
              ) : null}
            </ul>
          </article>

          <article className="dash-card assistant-card">
            <div className="dash-card-head">
              <h2>AI Assistant</h2>
            </div>
            <div className="assist-prompts">
              <Link href={`/agent?q=${encodeURIComponent(`Generate a creative brief for ${firstCampaign}`)}`}>
                Generate creative brief for {firstCampaign}
              </Link>
              <Link href="/agent?q=Suggest%20influencers%20for%20a%20skincare%20campaign">
                Suggest influencers for a skincare campaign
              </Link>
              <Link href="/agent?q=Write%20outreach%20email%20for%20fashion%20influencers">
                Write outreach email for fashion influencers
              </Link>
            </div>
            <form action="/agent" className="assist-form">
              <input name="q" placeholder="Ask anything..." />
              <button aria-label="Ask AI" type="submit">
                →
              </button>
            </form>
            <p className="assist-foot">Powered by AI</p>
          </article>
        </aside>
      </div>

      <div className="dash-bottom">
        <article className="dash-card">
          <div className="dash-card-head">
            <h2>Approvals Queue</h2>
            <Link href="/approvals">View all</Link>
          </div>
          <ul className="queue-list">
            {data.approvals.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.kind}</strong>
                  <span>
                    {item.campaignTitle} · {item.creatorName}
                  </span>
                  <em>{item.when}</em>
                </div>
                <Link className="review-btn" href={item.href}>
                  Review
                </Link>
              </li>
            ))}
            {!data.approvals.length ? (
              <li className="empty-state">Nothing waiting for review.</li>
            ) : null}
          </ul>
        </article>

        <article className="dash-card">
          <div className="dash-card-head">
            <h2>Client Live Links</h2>
            <Link href="/links">View all</Link>
          </div>
          <ul className="link-list">
            {data.clientLinks.map((item) => (
              <li key={item.id}>
                <strong>{item.client}</strong>
                <a href={item.url} rel="noreferrer" target="_blank">
                  {item.url.replace(/^https?:\/\//, '')}
                </a>
              </li>
            ))}
            {!data.clientLinks.length ? (
              <li className="empty-state">Create a campaign to generate a live client link.</li>
            ) : null}
          </ul>
        </article>
      </div>

      <article className="dash-card perf-strip">
        <div className="dash-card-head">
          <h2>Live Campaign Performance</h2>
          <span>Instagram stats from posted reels</span>
        </div>
        <div className="perf-grid">
          <div>
            <span>Total Reach</span>
            <strong>{compact(data.performance.reach)}</strong>
          </div>
          <div>
            <span>Total Views</span>
            <strong>{compact(data.performance.views)}</strong>
          </div>
          <div>
            <span>Engagement Rate</span>
            <strong>{data.performance.engagement}%</strong>
          </div>
          <div>
            <span>Likes</span>
            <strong>{compact(data.performance.likes)}</strong>
          </div>
          <div>
            <span>Comments</span>
            <strong>{compact(data.performance.comments)}</strong>
          </div>
        </div>
      </article>
    </PortalShell>
  )
}
