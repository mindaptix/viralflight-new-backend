import { requireSuperAdmin } from '../../lib/auth'
import { escapeCsv, firstParam } from '../../lib/format'
import { listAgencies } from '../../crm/data'

export const dynamic = 'force-dynamic'

type RouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function GET(_request: Request, context: RouteProps) {
  await requireSuperAdmin()
  const params = await context.searchParams
  const data = await listAgencies({
    q: firstParam(params.q),
    city: firstParam(params.city),
    agencyType: firstParam(params.agencyType),
    completion: (['complete', 'incomplete'].includes(firstParam(params.completion))
      ? firstParam(params.completion)
      : 'all') as 'all' | 'complete' | 'incomplete',
    status: firstParam(params.status),
    assigneeId: firstParam(params.assigneeId),
    page: 1,
    pageSize: 5000,
  })

  const header = [
    'id',
    'name',
    'mobile',
    'contactPerson',
    'city',
    'agencyType',
    'focusAreas',
    'website',
    'complete',
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
        row.contactPerson,
        row.city,
        row.agencyType,
        row.focusAreas.join('|'),
        row.website,
        row.complete,
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
      'Content-Disposition': 'attachment; filename="viralflight-agencies.csv"',
    },
  })
}
