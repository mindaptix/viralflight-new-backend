import { requireSuperAdmin } from '../../lib/auth'
import { escapeCsv, firstParam } from '../../lib/format'
import { listInfluencers } from '../../crm/data'

export const dynamic = 'force-dynamic'

type RouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function GET(_request: Request, context: RouteProps) {
  await requireSuperAdmin()
  const params = await context.searchParams
  const data = await listInfluencers({
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
