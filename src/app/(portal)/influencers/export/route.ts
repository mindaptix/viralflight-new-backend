import { requireSuperAdmin } from '../../lib/auth'
import { escapeCsv, firstParam } from '../../lib/format'
import { listInfluencers } from '../../crm/data'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  await requireSuperAdmin()
  const url = new URL(request.url)
  const get = (key: string) => firstParam(url.searchParams.get(key) ?? undefined)

  const data = await listInfluencers({
    q: get('q'),
    city: get('city'),
    niche: get('niche'),
    completion: (['complete', 'incomplete'].includes(get('completion'))
      ? get('completion')
      : 'all') as 'all' | 'complete' | 'incomplete',
    instagram: (['connected', 'not_connected'].includes(get('instagram'))
      ? get('instagram')
      : 'all') as 'all' | 'connected' | 'not_connected',
    status: get('status'),
    assigneeId: get('assigneeId'),
    page: 1,
    pageSize: 5000,
  })

  const header = [
    'id',
    'name',
    'mobile',
    'city',
    'niches',
    'followers',
    'complete',
    'instagramConnected',
    'managerName',
    'managerMobile',
    'crmStatus',
    'assignee',
    'tags',
    'createdAt',
  ]

  const lines = [
    header.join(','),
    ...data.rows.map((row) =>
      [
        row.id,
        row.name,
        row.mobile,
        row.city,
        row.niches.join('|'),
        row.followers,
        row.complete,
        row.instagramConnected,
        row.managerName,
        row.managerMobile,
        row.crm.status,
        row.crm.assigneeName,
        row.crm.tags.join('|'),
        row.createdAt,
      ]
        .map(escapeCsv)
        .join(','),
    ),
  ]

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="viralflight-influencers.csv"',
    },
  })
}
