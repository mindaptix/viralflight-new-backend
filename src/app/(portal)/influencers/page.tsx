import Link from 'next/link'

import { PortalShell } from '../components/portal-shell'
import { requireSuperAdmin } from '../lib/auth'
import {
  CITIES,
  CRM_STATUSES,
  firstParam,
  formatDate,
  formatNumber,
  NICHES,
} from '../lib/format'
import { listInfluencers, listStaffMembers } from '../crm/data'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function InfluencersPage({ searchParams }: PageProps) {
  const user = await requireSuperAdmin()
  const params = await searchParams
  const filters = {
    q: firstParam(params.q),
    city: firstParam(params.city),
    niche: firstParam(params.niche),
    completion: (['complete', 'incomplete'].includes(firstParam(params.completion))
      ? firstParam(params.completion)
      : 'all') as 'all' | 'complete' | 'incomplete',
    instagram: (['connected', 'not_connected'].includes(firstParam(params.instagram))
      ? firstParam(params.instagram)
      : 'all') as 'all' | 'connected' | 'not_connected',
    status: firstParam(params.status),
    assigneeId: firstParam(params.assigneeId),
    page: Number(firstParam(params.page) || '1') || 1,
    pageSize: 25,
  }

  const [data, staff] = await Promise.all([
    listInfluencers(filters),
    listStaffMembers(),
  ])
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))
  const exportHref = `/influencers/export?${new URLSearchParams({
    q: filters.q,
    city: filters.city,
    niche: filters.niche,
    completion: filters.completion,
    instagram: filters.instagram,
    status: filters.status,
    assigneeId: filters.assigneeId,
  }).toString()}`

  return (
    <PortalShell active="influencers" user={user}>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Creator CRM</p>
          <h1>Influencers</h1>
          <p>Search, filter and open full creator profiles registered on Viral Flight.</p>
        </div>
        <div className="heading-actions">
          <span className="live-badge">
            <i className="live-dot" />
            {formatNumber(data.total)} creators
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
            placeholder="Name, mobile, handle, manager…"
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
          Niche
          <select defaultValue={filters.niche} name="niche">
            <option value="">All niches</option>
            {NICHES.map((niche) => (
              <option key={niche} value={niche}>
                {niche}
              </option>
            ))}
          </select>
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
          Instagram
          <select defaultValue={filters.instagram} name="instagram">
            <option value="all">All</option>
            <option value="connected">Connected</option>
            <option value="not_connected">Not connected</option>
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
        <a className="clear-button" href="/influencers">
          Reset
        </a>
      </form>

      <article className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Creator</th>
                <th>City</th>
                <th>Niches</th>
                <th>Followers</th>
                <th>Status</th>
                <th>CRM</th>
                <th>Assignee</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id}>
                  <td className="person-cell">
                    <strong>{row.name}</strong>
                    <span>{row.mobile || 'No mobile'}</span>
                  </td>
                  <td>{row.city || '—'}</td>
                  <td>{row.niches.slice(0, 2).join(', ') || '—'}</td>
                  <td>{row.followers ? formatNumber(row.followers) : '—'}</td>
                  <td>
                    <span className={`status-badge ${row.complete ? 'complete' : 'incomplete'}`}>
                      {row.complete ? 'Complete' : 'Incomplete'}
                    </span>
                  </td>
                  <td>
                    <span className="role-badge">{row.crm.status}</span>
                  </td>
                  <td>{row.crm.assigneeName || '—'}</td>
                  <td>
                    <Link className="table-link" href={`/influencers/${row.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.rows.length ? (
            <div className="empty-state">No influencers match these filters.</div>
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
                href={`/influencers?${new URLSearchParams({
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
                href={`/influencers?${new URLSearchParams({
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
