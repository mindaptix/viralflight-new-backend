import { requireSuperAdmin } from '../../lib/auth'
import { escapeCsv, firstParam } from '../../lib/format'
import { listAgencies } from '../../crm/data'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  await requireSuperAdmin()
  const url = new URL(request.url)
  const get = (key: string) => firstParam(url.searchParams.get(key) ?? undefined)

  const data = await listAgencies({
    q: get('q'),
    city: get('city'),
    agencyType: get('agencyType'),
    completion: (['complete', 'incomplete'].includes(get('completion'))
      ? get('completion')
      : 'all') as 'all' | 'complete' | 'incomplete',
    status: get('status'),
    assigneeId: get('assigneeId'),
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
