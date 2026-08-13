import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Avatar } from '../../../components/avatar'
import { PortalShell } from '../../../components/portal-shell'
import { listInfluencers } from '../../../crm/data'
import { requireSuperAdmin } from '../../../lib/auth'
import { CITIES, NICHES, firstParam, formatNumber } from '../../../lib/format'
import { addCreatorsAction } from '../../actions'
import { getVfCampaign, listAssignments } from '../../data'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SelectCreatorsPage({ params, searchParams }: PageProps) {
  const user = await requireSuperAdmin()
  const { id } = await params
  const campaign = await getVfCampaign(id)
  if (!campaign) notFound()
  const query = await searchParams
  const assigned = await listAssignments(id)
  const assignedIds = new Set(assigned.map((row) => row.influencerId))
  const remaining = Math.max(0, campaign.slotsNeeded - assigned.filter((row) => row.status !== 'dropped').length)

  const data = await listInfluencers({
    q: firstParam(query.q),
    city: firstParam(query.city),
    niche: firstParam(query.niche),
    completion: 'all',
    instagram: 'all',
    status: '',
    assigneeId: '',
    page: Number(firstParam(query.page) || '1') || 1,
    pageSize: 40,
  })

  return (
    <PortalShell active="campaigns" user={user}>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">
            <Link href={`/campaigns/${campaign.id}`}>← {campaign.title}</Link>
          </p>
          <h1>Select influencers</h1>
          <p>
            Need {campaign.slotsNeeded} {campaign.deliverable}s. {remaining} slots left.
          </p>
        </div>
      </div>

      <form className="filters">
        <label className="grow">
          Search
          <input defaultValue={firstParam(query.q)} name="q" placeholder="Name, mobile…" type="search" />
        </label>
        <label>
          City
          <select defaultValue={firstParam(query.city)} name="city">
            <option value="">All</option>
            {CITIES.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </label>
        <label>
          Niche
          <select defaultValue={firstParam(query.niche)} name="niche">
            <option value="">All</option>
            {NICHES.map((niche) => (
              <option key={niche} value={niche}>{niche}</option>
            ))}
          </select>
        </label>
        <button className="filter-button" type="submit">Filter</button>
      </form>

      <form action={addCreatorsAction}>
        <input name="campaignId" type="hidden" value={campaign.id} />
        <article className="panel">
          <div className="panel-header">
            <h2>Creators</h2>
            <button className="filter-button" disabled={!remaining} type="submit">
              Add selected
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Creator</th>
                  <th>City</th>
                  <th>Niches</th>
                  <th>Followers</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => {
                  const taken = assignedIds.has(row.id)
                  return (
                    <tr key={row.id}>
                      <td>
                        <input disabled={taken} name="influencerId" type="checkbox" value={row.id} />
                      </td>
                      <td className="person-cell">
                        <Avatar name={row.name} src={row.photoUrl} />
                        <div>
                          <strong>{row.name}</strong>
                          <span>{taken ? 'Already added' : row.handle ? `@${row.handle}` : row.mobile || '—'}</span>
                        </div>
                      </td>
                      <td>{row.city || '—'}</td>
                      <td>{row.niches.slice(0, 2).join(', ') || '—'}</td>
                      <td>{row.followers ? formatNumber(row.followers) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </article>
      </form>
    </PortalShell>
  )
}
