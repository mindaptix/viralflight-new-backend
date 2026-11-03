import Link from 'next/link'

import { Avatar } from '../components/avatar'
import { PortalShell } from '../components/portal-shell'
import { listAgencies, listStaffMembers } from '../crm/data'
import { requireSuperAdmin } from '../lib/auth'
import {
  CITIES,
  CRM_STATUSES,
  firstParam,
  formatDate,
  formatNumber,
} from '../lib/format'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AgenciesPage({ searchParams }: PageProps) {
  const user = await requireSuperAdmin()
  const params = await searchParams
  const filters = {
    q: firstParam(params.q),
    city: firstParam(params.city),
    agencyType: firstParam(params.agencyType),
    completion: (['complete', 'incomplete'].includes(firstParam(params.completion))
      ? firstParam(params.completion)
      : 'all') as 'all' | 'complete' | 'incomplete',
    status: firstParam(params.status),
    assigneeId: firstParam(params.assigneeId),
    page: Number(firstParam(params.page) || '1') || 1,
    pageSize: 25,
  }

  const [data, staff] = await Promise.all([
    listAgencies(filters),
    listStaffMembers(),
  ])
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))
  const exportHref = `/agencies/export?${new URLSearchParams({
    q: filters.q,
    city: filters.city,
    agencyType: filters.agencyType,
    completion: filters.completion,
    status: filters.status,
    assigneeId: filters.assigneeId,
  }).toString()}`

  return (
    <PortalShell active="agencies" user={user}>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Agency CRM</p>
          <h1>Agencies</h1>
          <p>All agencies registered on the Viral Flight app.</p>
        </div>
        <div className="heading-actions">
          <span className="live-badge">
            <i className="live-dot" />
            {formatNumber(data.total)} agencies
          </span>
          <a className="filter-button" href={exportHref}>
            Export CSV
          </a>
        </div>
      </div>

      <form className="filters">
        <label className="grow">
          Search
          <input
            defaultValue={filters.q}
            name="q"
            placeholder="Agency, contact, mobile, website…"
            type="search"
          />
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
          Type
          <input
            defaultValue={filters.agencyType}
            name="agencyType"
            placeholder="Agency type"
          />
        </label>
        <label>
          Profile
          <select defaultValue={filters.completion} name="completion">
            <option value="all">All</option>
            <option value="complete">Complete</option>
            <option value="incomplete">Incomplete</option>
          </select>
        </label>
        <label>
          CRM status
          <select defaultValue={filters.status} name="status">
            <option value="">All</option>
            {CRM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          Assignee
          <select defaultValue={filters.assigneeId} name="assigneeId">
            <option value="">Anyone</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
        <button className="filter-button" type="submit">
          Apply
        </button>
        <a className="clear-button" href="/agencies">
          Reset
        </a>
      </form>

      <article className="directory-panel">
        <div className="agency-card-grid">
          {data.rows.map((row) => (
            <Link className="agency-directory-card" href={`/agencies/${row.id}`} key={row.id}>
              <div className="agency-card-accent" />
              <div className="agency-card-top">
                <Avatar name={row.name} size="lg" src={row.profileImageUrl} />
                <span className={`status-badge ${row.complete ? 'complete' : 'incomplete'}`}>
                  {row.complete ? 'Complete' : 'Incomplete'}
                </span>
              </div>
              <div className="agency-card-title">
                <span>{row.agencyType || 'Agency partner'}</span>
                <h2>{row.name}</h2>
                <p>{row.city || 'Location not set'} · {row.mobile || 'No mobile'}</p>
              </div>
              <div className="agency-card-focus">
                {row.focusAreas.slice(0, 3).map((focus) => (
                  <span key={focus}>{focus}</span>
                ))}
                {!row.focusAreas.length ? <span>Focus not added</span> : null}
              </div>
              <div className="agency-card-meta">
                <div><span>Contact</span><strong>{row.contactPerson || 'Not set'}</strong></div>
                <div><span>CRM stage</span><strong>{row.crm.status}</strong></div>
              </div>
              <div className="agency-card-footer">
                <span>Joined {formatDate(row.createdAt)}</span>
                <strong>Open agency <b>→</b></strong>
              </div>
            </Link>
          ))}
          {!data.rows.length ? (
            <div className="empty-state">No agencies match these filters.</div>
          ) : null}
        </div>

        <div className="pager">
          <span>
            Page {data.page} of {totalPages}
          </span>
          <div className="pager-actions">
            {data.page > 1 ? (
              <a
                className="clear-button"
                href={`/agencies?${new URLSearchParams({
                  ...Object.fromEntries(
                    Object.entries(filters).map(([k, v]) => [k, String(v)]),
                  ),
                  page: String(data.page - 1),
                }).toString()}`}
              >
                Previous
              </a>
            ) : null}
            {data.page < totalPages ? (
              <a
                className="filter-button"
                href={`/agencies?${new URLSearchParams({
                  ...Object.fromEntries(
                    Object.entries(filters).map(([k, v]) => [k, String(v)]),
                  ),
                  page: String(data.page + 1),
                }).toString()}`}
              >
                Next
              </a>
            ) : null}
          </div>
        </div>
      </article>
    </PortalShell>
  )
}
