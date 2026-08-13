import { getCreatorInsightBuckets, listInfluencers } from './crm/data'
import { formatDate } from './lib/format'
import { listAssignments, listVfCampaigns } from './campaigns/data'
import { type CreatorStatus } from './campaigns/constants'

function campaignUiStatus(status: string) {
  if (status === 'completed') return 'Completed'
  if (status === 'draft' || status === 'archived') return 'On Hold'
  return 'In Progress'
}

function progressFor(done: number, total: number) {
  if (!total) return 0
  return Math.min(100, Math.round((done / total) * 100))
}

function timeAgo(iso: string) {
  if (!iso) return ''
  const delta = Date.now() - new Date(iso).getTime()
  const mins = Math.max(1, Math.round(delta / 60000))
  if (mins < 60) return `Submitted ${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `Submitted ${hours}h ago`
  const days = Math.round(hours / 24)
  return `Submitted ${days}d ago`
}

export async function getAgencyDashboard() {
  const [campaigns, influencers, buckets] = await Promise.all([
    listVfCampaigns(),
    listInfluencers({
      q: '',
      city: '',
      niche: '',
      completion: 'all',
      instagram: 'all',
      status: '',
      assigneeId: '',
      page: 1,
      pageSize: 8,
    }),
    getCreatorInsightBuckets(),
  ])

  const assignmentGroups = await Promise.all(
    campaigns.map(async (campaign) => ({
      campaign,
      rows: await listAssignments(campaign.id),
    })),
  )

  const approvals = assignmentGroups
    .flatMap(({ campaign, rows }) =>
      rows
        .filter((row) =>
          ['script_submitted', 'video_submitted', 'video_approved'].includes(row.status),
        )
        .map((row) => {
          const kind =
            row.status === 'script_submitted'
              ? 'Script review'
              : row.status === 'video_submitted'
                ? 'Video approval'
                : 'Final content approval'
          return {
            id: row.id,
            kind,
            campaignTitle: campaign.title,
            creatorName: row.name,
            when: timeAgo(row.updatedAt),
            href: `/campaigns/${campaign.id}`,
          }
        }),
    )
    .slice(0, 6)

  const table = assignmentGroups.slice(0, 6).map(({ campaign, rows }) => {
    const active = rows.filter((row) => row.status !== 'dropped')
    const done = active.filter((row) => row.status === 'live' || row.status === 'video_approved').length
    const liveStats = active.reduce(
      (sum, row) => ({
        views: sum.views + (row.stats?.views || 0),
        likes: sum.likes + (row.stats?.likes || 0),
        comments: sum.comments + (row.stats?.comments || 0),
        reach: sum.reach + (row.stats?.reach || 0),
      }),
      { views: 0, likes: 0, comments: 0, reach: 0 },
    )
    return {
      id: campaign.id,
      title: campaign.title,
      reelsLabel: `${campaign.slotsNeeded} ${campaign.deliverable}${campaign.slotsNeeded === 1 ? '' : 's'}`,
      client: campaign.clientName || campaign.brandName || 'Internal',
      done,
      total: campaign.slotsNeeded,
      progress: progressFor(done, campaign.slotsNeeded),
      status: campaignUiStatus(campaign.status),
      due: formatDate(campaign.videoDeadline),
      clientUrl: campaign.clientUrl,
      stats: liveStats,
    }
  })

  const pendingApprovals = assignmentGroups.reduce(
    (sum, group) =>
      sum +
      group.rows.filter((row) =>
        ['script_submitted', 'video_submitted'].includes(row.status as CreatorStatus),
      ).length,
    0,
  )

  const liveCampaigns = campaigns.filter((item) =>
    ['active', 'in_review', 'live'].includes(item.status),
  ).length

  const totals = table.reduce(
    (sum, row) => ({
      views: sum.views + row.stats.views,
      likes: sum.likes + row.stats.likes,
      comments: sum.comments + row.stats.comments,
      reach: sum.reach + row.stats.reach,
    }),
    { views: 0, likes: 0, comments: 0, reach: 0 },
  )
  const engagement =
    totals.views > 0
      ? Number((((totals.likes + totals.comments) / totals.views) * 100).toFixed(2))
      : 0

  const pipelineSteps = [
    ['invited', 'Invited'],
    ['script_submitted', 'Script in'],
    ['script_approved', 'Script OK'],
    ['video_submitted', 'Video in'],
    ['video_approved', 'Ready'],
    ['live', 'Live'],
  ] as const
  const pipelineCounts = Object.fromEntries(pipelineSteps.map(([key]) => [key, 0]))
  for (const group of assignmentGroups) {
    for (const row of group.rows) {
      if (row.status in pipelineCounts) pipelineCounts[row.status] += 1
    }
  }

  return {
    metrics: {
      liveCampaigns,
      influencers: influencers.total,
      pendingApprovals,
      clientLinks: campaigns.length,
    },
    campaigns: table,
    approvals,
    clientLinks: campaigns.slice(0, 6).map((campaign) => ({
      id: campaign.id,
      client: campaign.clientName || campaign.brandName || campaign.title,
      url: campaign.clientUrl,
    })),
    shortlist: influencers.rows.slice(0, 5).map((row) => ({
      id: row.id,
      name: row.name,
      city: row.city,
      followers: row.followers,
      niche: row.niches[0] || 'Creator',
      handle: row.handle,
      photoUrl: row.photoUrl,
      match: Math.min(99, 70 + Math.round((row.followers || 0) / 50000)),
    })),
    performance: {
      ...totals,
      engagement,
    },
    insights: {
      pipeline: pipelineSteps.map(([key, label]) => ({
        label,
        value: pipelineCounts[key] || 0,
      })),
      campaignViews: table
        .map((row) => ({
          label: row.title,
          value: row.stats.views,
        }))
        .filter((row) => row.value > 0)
        .slice(0, 6),
      cities: buckets.cities,
      niches: buckets.niches,
    },
  }
}
