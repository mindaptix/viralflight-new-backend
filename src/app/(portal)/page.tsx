import config from '@payload-config'
import { headers } from 'next/headers'
import Link from 'next/link'
import { getPayload } from 'payload'

import { LoginForm, LogoutButton } from './auth-controls'
import { PortalShell, Brand } from './components/portal-shell'
import {
  getDashboardData,
  type CompletionFilter,
  type DashboardFilters,
  type RoleFilter,
} from './dashboard-data'
import { CITIES, formatDate, formatNumber } from './lib/format'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function readFilters(params: Record<string, string | string[] | undefined>): DashboardFilters {
  const roleValue = first(params.role)
  const completionValue = first(params.completion)
  const role: RoleFilter = ['influencer', 'brand', 'agency'].includes(roleValue)
    ? (roleValue as RoleFilter)
    : 'all'
  const completion: CompletionFilter = ['complete', 'incomplete'].includes(completionValue)
    ? (completionValue as CompletionFilter)
    : 'all'

  return {
    role,
    completion,
    city: first(params.city),
    from: first(params.from),
    to: first(params.to),
  }
}

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

function RankingList({
  items,
  empty,
}: {
  items: Array<{ label: string; value: number }>
  empty: string
}) {
  const max = Math.max(...items.map((item) => item.value), 1)
  if (!items.length) return <div className="empty-state">{empty}</div>

  return (
    <ol className="rank-list">
      {items.map((item) => (
        <li key={item.label}>
          <div className="rank-label">
            <span>{item.label}</span>
            <div className="rank-track">
              <i style={{ width: `${Math.max((item.value / max) * 100, 4)}%` }} />
            </div>
          </div>
          <strong>{formatNumber(item.value)}</strong>
        </li>
      ))}
    </ol>
  )
}

function profileHref(role: string, id: string) {
  if (role === 'influencer') return `/influencers/${id}`
  if (role === 'agency') return `/agencies/${id}`
  return null
}

export default async function Page({ searchParams }: PageProps) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) return <LoginPage />

  if (user.role !== 'super_admin') {
    return (
      <main className="restricted">
        <span className="brand-mark">VF</span>
        <p className="eyebrow">Access restricted</p>
        <h1>Super admin access required</h1>
        <p>This account can use Payload Admin, but it cannot open the operations portal.</p>
        <LogoutButton />
      </main>
    )
  }

  const filters = readFilters(await searchParams)
  const data = await getDashboardData(filters)
  const completionRate = data.metrics.totalUsers
    ? Math.round((data.metrics.completedProfiles / data.metrics.totalUsers) * 100)
    : 0
  const metricCards = [
    ['↗', 'Total registrations', data.metrics.totalUsers],
    ['◎', 'Influencers', data.metrics.influencers],
    ['◆', 'Brands', data.metrics.brands],
    ['△', 'Agencies', data.metrics.agencies],
    ['✓', 'Complete profiles', data.metrics.completedProfiles],
    ['#', 'Completion rate', `${completionRate}%`],
    ['•', 'Verified mobiles', data.metrics.verifiedMobiles],
    ['◉', 'Instagram connected', data.metrics.instagramConnected],
    ['+', 'New this month', data.metrics.newThisMonth],
    ['◇', 'Active campaigns', data.metrics.activeCampaigns],
  ] as const

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
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Network intelligence</p>
          <h1>Operations overview</h1>
          <p>CRM for influencers & agencies, plus onboarding and campaign signals.</p>
        </div>
        <div className="heading-actions">
          <Link className="filter-button" href="/agent">
            Ask AI Agent
          </Link>
          <Link className="clear-button" href="/influencers">
            Influencers
          </Link>
          <Link className="clear-button" href="/agencies">
            Agencies
          </Link>
          <span className="live-badge">
            <i className="live-dot" />
            Live database
          </span>
        </div>
      </div>

      <form className="filters">
        <label>
          Audience
          <select defaultValue={filters.role} name="role">
            <option value="all">All users</option>
            <option value="influencer">Influencers</option>
            <option value="brand">Brands</option>
            <option value="agency">Agencies</option>
          </select>
        </label>
        <label>
          City
          <select defaultValue={filters.city} name="city">
            <option value="">All cities</option>
            {CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
        <label>
          Profile status
          <select defaultValue={filters.completion} name="completion">
            <option value="all">All profiles</option>
            <option value="complete">Complete</option>
            <option value="incomplete">Incomplete</option>
          </select>
        </label>
        <label>
          From
          <input defaultValue={filters.from} name="from" type="date" />
        </label>
        <label>
          To
          <input defaultValue={filters.to} name="to" type="date" />
        </label>
        <button className="filter-button" type="submit">
          Apply
        </button>
        <a className="clear-button" href="/">
          Reset
        </a>
      </form>

      <section className="metric-grid">
        {metricCards.map(([icon, label, value]) => (
          <article className="metric-card" key={label}>
            <span className="metric-icon">{icon}</span>
            <strong>{typeof value === 'number' ? formatNumber(value) : value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </section>

      <section className="section-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Recent onboarding</h2>
            <span>{data.recent.length} latest records</span>
          </div>
          {data.recent.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>City</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((row) => {
                    const href = profileHref(row.role, row.id)
                    return (
                      <tr key={`${row.role}-${row.id}`}>
                        <td className="person-cell">
                          {href ? (
                            <Link className="table-link" href={href}>
                              <strong>{row.name}</strong>
                            </Link>
                          ) : (
                            <strong>{row.name}</strong>
                          )}
                          <span>{row.mobile}</span>
                        </td>
                        <td>
                          <span className="role-badge">{row.role}</span>
                        </td>
                        <td>{row.city}</td>
                        <td>
                          <span
                            className={`status-badge ${
                              row.complete ? 'complete' : 'incomplete'
                            }`}
                          >
                            {row.complete ? 'Complete' : 'Incomplete'}
                          </span>
                        </td>
                        <td>{formatDate(row.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">No onboarding records match these filters.</div>
          )}
        </article>

        <div className="side-stack">
          <article className="panel">
            <div className="panel-header">
              <h2>Top cities</h2>
              <span>By profiles</span>
            </div>
            <RankingList items={data.cities} empty="No city data available." />
          </article>
          <article className="panel">
            <div className="panel-header">
              <h2>Top niches & industries</h2>
              <span>Audience mix</span>
            </div>
            <RankingList items={data.segments} empty="No segment data available." />
          </article>
          <article className="panel">
            <div className="panel-header">
              <h2>Campaign activity</h2>
              <span>Selected date range</span>
            </div>
            <ol className="rank-list">
              <li>
                <div className="rank-label">
                  <span>Total campaigns</span>
                </div>
                <strong>{formatNumber(data.metrics.campaigns)}</strong>
              </li>
              <li>
                <div className="rank-label">
                  <span>Applications received</span>
                </div>
                <strong>{formatNumber(data.metrics.applications)}</strong>
              </li>
            </ol>
          </article>
        </div>
      </section>
    </PortalShell>
  )
}
