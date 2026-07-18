import mongoose from 'mongoose'

export type RoleFilter = 'all' | 'influencer' | 'brand' | 'agency'
export type CompletionFilter = 'all' | 'complete' | 'incomplete'

export type DashboardFilters = {
  role: RoleFilter
  city: string
  completion: CompletionFilter
  from: string
  to: string
}

export type DashboardRow = {
  id: string
  role: Exclude<RoleFilter, 'all'>
  name: string
  mobile: string
  city: string
  detail: string
  complete: boolean
  createdAt: string
}

export type DashboardData = {
  metrics: {
    totalUsers: number
    influencers: number
    brands: number
    agencies: number
    completedProfiles: number
    verifiedMobiles: number
    instagramConnected: number
    newThisMonth: number
    campaigns: number
    activeCampaigns: number
    applications: number
  }
  recent: DashboardRow[]
  cities: Array<{ label: string; value: number }>
  segments: Array<{ label: string; value: number }>
}

type ProfileConfig = {
  role: DashboardRow['role']
  collection: 'influencer_profiles' | 'brand_profiles' | 'agency_profiles'
  nameField: 'name' | 'brandName' | 'agencyName'
  segmentField: 'contentCategories' | 'industry' | 'focusAreas'
  detailField: 'collaborationPreference' | 'industry' | 'agencyType'
}

const profileConfigs: ProfileConfig[] = [
  {
    role: 'influencer',
    collection: 'influencer_profiles',
    nameField: 'name',
    segmentField: 'contentCategories',
    detailField: 'collaborationPreference',
  },
  {
    role: 'brand',
    collection: 'brand_profiles',
    nameField: 'brandName',
    segmentField: 'industry',
    detailField: 'industry',
  },
  {
    role: 'agency',
    collection: 'agency_profiles',
    nameField: 'agencyName',
    segmentField: 'focusAreas',
    detailField: 'agencyType',
  },
]

function safeDate(value: string, endOfDay = false): Date | null {
  if (!value) return null
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`)
  return Number.isNaN(date.getTime()) ? null : date
}

function profileMatch(filters: DashboardFilters, includeCity = true) {
  const match: Record<string, unknown> = {}
  const from = safeDate(filters.from)
  const to = safeDate(filters.to, true)

  if (from || to) {
    match.createdAt = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    }
  }
  if (includeCity && filters.city) match.city = filters.city
  if (filters.completion === 'complete') match.isProfileComplete = true
  if (filters.completion === 'incomplete') match.isProfileComplete = { $ne: true }
  return match
}

function activityDateMatch(filters: DashboardFilters) {
  const match: Record<string, unknown> = {}
  const from = safeDate(filters.from)
  const to = safeDate(filters.to, true)
  if (from || to) {
    match.createdAt = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    }
  }
  return match
}

function selectedConfigs(role: RoleFilter) {
  return role === 'all'
    ? profileConfigs
    : profileConfigs.filter((config) => config.role === role)
}

function displayDetail(value: unknown) {
  if (Array.isArray(value)) return value.filter(Boolean).slice(0, 2).join(', ')
  if (typeof value !== 'string') return ''
  return value.replaceAll('_', ' ')
}

function asIso(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ''))
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

export async function getDashboardData(
  filters: DashboardFilters,
): Promise<DashboardData> {
  const db = mongoose.connection.db
  if (!db) throw new Error('Database connection is not ready')

  const selected = selectedConfigs(filters.role)
  const match = profileMatch(filters)
  const matchWithoutCity = profileMatch(filters, false)
  const dateMatch = activityDateMatch(filters)
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const roleCounts = await Promise.all(
    profileConfigs.map(async (config) => ({
      role: config.role,
      count: selected.some((item) => item.role === config.role)
        ? await db.collection(config.collection).countDocuments(match)
        : 0,
    })),
  )

  const [
    totalUsers,
    verifiedMobiles,
    completedProfilesByRole,
    instagramConnected,
    newThisMonthByRole,
    campaigns,
    activeCampaigns,
    applications,
    recentGroups,
    cityGroups,
    segmentGroups,
  ] = await Promise.all([
    db.collection('users').countDocuments(
      filters.role === 'all' ? dateMatch : { ...dateMatch, role: filters.role },
    ),
    db.collection('users').countDocuments({
      ...(filters.role === 'all' ? {} : { role: filters.role }),
      ...dateMatch,
      isMobileVerified: true,
    }),
    Promise.all(
      selected.map((config) =>
        db.collection(config.collection).countDocuments({
          ...match,
          isProfileComplete: true,
        }),
      ),
    ),
    selected.some((config) => config.role === 'influencer')
      ? db.collection('influencer_profiles').countDocuments({
          ...match,
          'instagram.isConnected': true,
        })
      : Promise.resolve(0),
    Promise.all(
      selected.map((config) =>
        db.collection(config.collection).countDocuments({
          ...matchWithoutCity,
          createdAt: {
            ...((matchWithoutCity.createdAt as Record<string, Date>) ?? {}),
            $gte: monthStart,
          },
        }),
      ),
    ),
    db.collection('campaigns').countDocuments(dateMatch),
    db.collection('campaigns').countDocuments({ ...dateMatch, status: 'active' }),
    db.collection('campaign_applications').countDocuments(dateMatch),
    Promise.all(
      selected.map(async (config) => {
        const docs = await db
          .collection(config.collection)
          .find(match as object)
          .sort({ createdAt: -1 })
          .limit(12)
          .toArray()
        return docs.map<DashboardRow>((doc) => ({
          id: String(doc._id),
          role: config.role,
          name: String(doc[config.nameField] || 'Unnamed'),
          mobile: String(doc.mobile || ''),
          city: String(doc.city || 'Not set'),
          detail: displayDetail(doc[config.detailField]),
          complete: doc.isProfileComplete === true,
          createdAt: asIso(doc.createdAt),
        }))
      }),
    ),
    Promise.all(
      selected.map((config) =>
        db
          .collection(config.collection)
          .aggregate<{ _id: string; count: number }>([
            { $match: matchWithoutCity },
            { $group: { _id: { $ifNull: ['$city', 'Not set'] }, count: { $sum: 1 } } },
          ])
          .toArray(),
      ),
    ),
    Promise.all(
      selected.map((config) =>
        db
          .collection(config.collection)
          .aggregate<{ _id: string; count: number }>([
            { $match: match },
            {
              $project: {
                segment: {
                  $cond: [
                    { $isArray: `$${config.segmentField}` },
                    `$${config.segmentField}`,
                    [`$${config.segmentField}`],
                  ],
                },
              },
            },
            { $unwind: '$segment' },
            { $match: { segment: { $nin: [null, ''] } } },
            { $group: { _id: '$segment', count: { $sum: 1 } } },
          ])
          .toArray(),
      ),
    ),
  ])

  const counts = Object.fromEntries(roleCounts.map((item) => [item.role, item.count]))
  const mergeGroups = (groups: Array<Array<{ _id: string; count: number }>>) => {
    const merged = new Map<string, number>()
    for (const group of groups) {
      for (const item of group) {
        const label = item._id || 'Not set'
        merged.set(label, (merged.get(label) ?? 0) + item.count)
      }
    }
    return [...merged.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }

  return {
    metrics: {
      totalUsers,
      influencers: counts.influencer ?? 0,
      brands: counts.brand ?? 0,
      agencies: counts.agency ?? 0,
      completedProfiles: completedProfilesByRole.reduce((sum, value) => sum + value, 0),
      verifiedMobiles,
      instagramConnected,
      newThisMonth: newThisMonthByRole.reduce((sum, value) => sum + value, 0),
      campaigns,
      activeCampaigns,
      applications,
    },
    recent: recentGroups
      .flat()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 15),
    cities: mergeGroups(cityGroups),
    segments: mergeGroups(segmentGroups),
  }
}
