import mongoose from 'mongoose'
import { ObjectId } from 'mongodb'

import { CITIES, NICHES, asIso, formatNumber } from '../lib/format'

function db() {
  const connection = mongoose.connection.db
  if (!connection) throw new Error('Database connection is not ready')
  return connection
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function followersFromDoc(doc: Record<string, unknown>) {
  const platforms = Array.isArray(doc.platforms) ? doc.platforms : []
  let max = 0
  for (const platform of platforms) {
    if (!platform || typeof platform !== 'object') continue
    const item = platform as Record<string, unknown>
    const count = Number(item.followers ?? item.subscribers ?? 0)
    if (Number.isFinite(count) && count > max) max = count
  }
  const ig =
    doc.instagram && typeof doc.instagram === 'object'
      ? (doc.instagram as Record<string, unknown>)
      : null
  const igFollowers = Number(ig?.followers ?? 0)
  if (Number.isFinite(igFollowers) && igFollowers > max) max = igFollowers
  return max
}

function normalizeCity(city?: string | null) {
  if (!city) return ''
  const raw = city.trim()
  const hit = CITIES.find((item) => item.toLowerCase() === raw.toLowerCase())
  if (hit) return hit
  // common aliases
  const aliases: Record<string, (typeof CITIES)[number]> = {
    bangalore: 'Bengaluru',
    bengaluru: 'Bengaluru',
    newdelhi: 'Delhi',
    'new delhi': 'Delhi',
    delhi: 'Delhi',
    ncr: 'Delhi',
    bombay: 'Mumbai',
    mumbai: 'Mumbai',
  }
  return aliases[raw.toLowerCase().replace(/\s+/g, '')] || aliases[raw.toLowerCase()] || raw
}

function normalizeNiche(niche: string) {
  const hit = NICHES.find((item) => item.toLowerCase() === niche.trim().toLowerCase())
  return hit || niche.trim()
}

export type InfluencerAgentFilters = {
  q?: string
  city?: string
  niches?: string[]
  languages?: string[]
  minFollowers?: number
  maxFollowers?: number
  /** Brand budget / max affordable rate — matches creators whose min rate is within budget */
  maxBudget?: number
  /** Minimum rate floor — creators whose max rate is at least this */
  minBudget?: number
  complete?: boolean
  instagramConnected?: boolean
  collaborationPreference?: string
  limit?: number
  sortBy?: 'newest' | 'followers' | 'rate_asc' | 'rate_desc'
}

export type InfluencerAgentResult = {
  id: string
  name: string
  city: string
  mobile: string
  niches: string[]
  followers: number
  rateMin: number | null
  rateMax: number | null
  currency: string
  complete: boolean
  instagramConnected: boolean
  managerName: string
  href: string
}

export async function searchInfluencersTool(
  filters: InfluencerAgentFilters,
): Promise<{ totalMatched: number; results: InfluencerAgentResult[]; appliedFilters: Record<string, unknown> }> {
  const match: Record<string, unknown> = {}
  const city = normalizeCity(filters.city)
  if (city) match.city = city

  const niches = (filters.niches || []).map(normalizeNiche).filter(Boolean)
  if (niches.length === 1) match.contentCategories = niches[0]
  if (niches.length > 1) match.contentCategories = { $in: niches }

  if (filters.languages?.length) {
    match.contentLanguages = { $in: filters.languages }
  }
  if (filters.complete === true) match.isProfileComplete = true
  if (filters.complete === false) match.isProfileComplete = { $ne: true }
  if (filters.instagramConnected === true) match['instagram.isConnected'] = true
  if (filters.instagramConnected === false) match['instagram.isConnected'] = { $ne: true }
  if (filters.collaborationPreference) {
    match.collaborationPreference = filters.collaborationPreference
  }

  if (filters.maxBudget != null && Number.isFinite(filters.maxBudget)) {
    // Affordable within budget: min rate exists and <= budget, OR max rate <= budget
    match.$and = [
      ...(Array.isArray(match.$and) ? (match.$and as unknown[]) : []),
      {
        $or: [
          { 'rateRange.min': { $lte: Number(filters.maxBudget) } },
          {
            $and: [
              { 'rateRange.min': { $exists: false } },
              { 'rateRange.max': { $lte: Number(filters.maxBudget) } },
            ],
          },
          { 'rateCard.items.price': { $lte: Number(filters.maxBudget) } },
        ],
      },
    ]
  }

  if (filters.minBudget != null && Number.isFinite(filters.minBudget)) {
    match.$and = [
      ...(Array.isArray(match.$and) ? (match.$and as unknown[]) : []),
      {
        $or: [
          { 'rateRange.max': { $gte: Number(filters.minBudget) } },
          { 'rateRange.min': { $gte: Number(filters.minBudget) } },
        ],
      },
    ]
  }

  const q = String(filters.q || '').trim()
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: 'i' }
    match.$or = [
      { name: rx },
      { mobile: rx },
      { bio: rx },
      { managerName: rx },
      { profession: rx },
      { 'platforms.username': rx },
      { 'instagram.handle': rx },
    ]
  }

  const limit = Math.min(50, Math.max(1, Number(filters.limit) || 15))
  const docs = await db()
    .collection('influencer_profiles')
    .find(match)
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray()

  let rows: InfluencerAgentResult[] = docs.map((doc) => {
    const rate =
      doc.rateRange && typeof doc.rateRange === 'object'
        ? (doc.rateRange as Record<string, unknown>)
        : {}
    const rateMin = Number(rate.min)
    const rateMax = Number(rate.max)
    return {
      id: String(doc._id),
      name: String(doc.name || 'Unnamed creator'),
      city: String(doc.city || ''),
      mobile: String(doc.mobile || ''),
      niches: Array.isArray(doc.contentCategories)
        ? doc.contentCategories.map(String)
        : [],
      followers: followersFromDoc(doc as Record<string, unknown>),
      rateMin: Number.isFinite(rateMin) ? rateMin : null,
      rateMax: Number.isFinite(rateMax) ? rateMax : null,
      currency: String(rate.currency || 'INR'),
      complete: doc.isProfileComplete === true,
      instagramConnected: Boolean(
        doc.instagram &&
          typeof doc.instagram === 'object' &&
          (doc.instagram as { isConnected?: boolean }).isConnected,
      ),
      managerName: String(doc.managerName || ''),
      href: `/influencers/${String(doc._id)}`,
    }
  })

  if (filters.minFollowers != null) {
    rows = rows.filter((row) => row.followers >= Number(filters.minFollowers))
  }
  if (filters.maxFollowers != null) {
    rows = rows.filter((row) => row.followers <= Number(filters.maxFollowers))
  }

  const sortBy = filters.sortBy || 'newest'
  if (sortBy === 'followers') rows.sort((a, b) => b.followers - a.followers)
  if (sortBy === 'rate_asc') {
    rows.sort((a, b) => (a.rateMin ?? Number.MAX_SAFE_INTEGER) - (b.rateMin ?? Number.MAX_SAFE_INTEGER))
  }
  if (sortBy === 'rate_desc') {
    rows.sort((a, b) => (b.rateMax ?? 0) - (a.rateMax ?? 0))
  }

  const totalMatched = rows.length
  const results = rows.slice(0, limit)

  return {
    totalMatched,
    results,
    appliedFilters: {
      city: city || undefined,
      niches: niches.length ? niches : undefined,
      languages: filters.languages,
      minFollowers: filters.minFollowers,
      maxFollowers: filters.maxFollowers,
      maxBudget: filters.maxBudget,
      minBudget: filters.minBudget,
      complete: filters.complete,
      instagramConnected: filters.instagramConnected,
      q: q || undefined,
      sortBy,
      limit,
    },
  }
}

export type AgencyAgentFilters = {
  q?: string
  city?: string
  agencyType?: string
  complete?: boolean
  limit?: number
}

export async function searchAgenciesTool(filters: AgencyAgentFilters) {
  const match: Record<string, unknown> = {}
  const city = normalizeCity(filters.city)
  if (city) match.city = city
  if (filters.agencyType) match.agencyType = filters.agencyType
  if (filters.complete === true) match.isProfileComplete = true
  if (filters.complete === false) match.isProfileComplete = { $ne: true }

  const q = String(filters.q || '').trim()
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: 'i' }
    match.$or = [
      { agencyName: rx },
      { mobile: rx },
      { contactPerson: rx },
      { contactName: rx },
      { website: rx },
      { bio: rx },
      { description: rx },
    ]
  }

  const limit = Math.min(50, Math.max(1, Number(filters.limit) || 15))
  const [totalMatched, docs] = await Promise.all([
    db().collection('agency_profiles').countDocuments(match),
    db()
      .collection('agency_profiles')
      .find(match)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray(),
  ])

  return {
    totalMatched,
    results: docs.map((doc) => ({
      id: String(doc._id),
      name: String(doc.agencyName || 'Unnamed agency'),
      city: String(doc.city || ''),
      mobile: String(doc.mobile || ''),
      agencyType: String(doc.agencyType || ''),
      contactPerson: String(doc.contactPerson || doc.contactName || ''),
      complete: doc.isProfileComplete === true,
      href: `/agencies/${String(doc._id)}`,
    })),
    appliedFilters: {
      city: city || undefined,
      agencyType: filters.agencyType,
      complete: filters.complete,
      q: q || undefined,
      limit,
    },
  }
}

export async function getInfluencerByIdTool(id: string) {
  let objectId: ObjectId
  try {
    objectId = new ObjectId(id)
  } catch {
    return { found: false as const, error: 'Invalid influencer id' }
  }
  const doc = await db().collection('influencer_profiles').findOne({ _id: objectId })
  if (!doc) return { found: false as const, error: 'Influencer not found' }

  const rate =
    doc.rateRange && typeof doc.rateRange === 'object'
      ? (doc.rateRange as Record<string, unknown>)
      : {}
  const ig =
    doc.instagram && typeof doc.instagram === 'object'
      ? (doc.instagram as Record<string, unknown>)
      : {}

  return {
    found: true as const,
    profile: {
      id: String(doc._id),
      name: String(doc.name || 'Unnamed creator'),
      city: String(doc.city || ''),
      mobile: String(doc.mobile || ''),
      bio: String(doc.bio || ''),
      profession: String(doc.profession || ''),
      niches: Array.isArray(doc.contentCategories) ? doc.contentCategories.map(String) : [],
      languages: Array.isArray(doc.contentLanguages) ? doc.contentLanguages.map(String) : [],
      followers: followersFromDoc(doc as Record<string, unknown>),
      rateMin: Number.isFinite(Number(rate.min)) ? Number(rate.min) : null,
      rateMax: Number.isFinite(Number(rate.max)) ? Number(rate.max) : null,
      currency: String(rate.currency || 'INR'),
      managerName: String(doc.managerName || ''),
      managerMobile: String(doc.managerMobile || ''),
      instagramHandle: String(ig.handle || ''),
      instagramConnected: Boolean(ig.isConnected),
      complete: doc.isProfileComplete === true,
      createdAt: asIso(doc.createdAt),
      href: `/influencers/${String(doc._id)}`,
    },
  }
}

export async function networkStatsTool() {
  const [influencers, agencies, brands, campaigns] = await Promise.all([
    db().collection('influencer_profiles').countDocuments({}),
    db().collection('agency_profiles').countDocuments({}),
    db().collection('brand_profiles').countDocuments({}),
    db().collection('campaigns').countDocuments({}),
  ])
  return {
    influencers: formatNumber(influencers),
    agencies: formatNumber(agencies),
    brands: formatNumber(brands),
    campaigns: formatNumber(campaigns),
    influencersRaw: influencers,
    agenciesRaw: agencies,
    brandsRaw: brands,
    campaignsRaw: campaigns,
  }
}

export const AGENT_TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_influencers',
      description:
        'Search Viral Flight influencer profiles by city, niches, follower counts, and budget/rate range. Use for list requests like "Delhi influencers under 20k".',
      parameters: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Free-text name/handle/bio search' },
          city: {
            type: 'string',
            description: `City filter. Prefer one of: ${CITIES.join(', ')}`,
          },
          niches: {
            type: 'array',
            items: { type: 'string' },
            description: `Content niches. Prefer: ${NICHES.join(', ')}`,
          },
          languages: {
            type: 'array',
            items: { type: 'string' },
            description: 'Content languages e.g. Hindi, English',
          },
          minFollowers: { type: 'number' },
          maxFollowers: { type: 'number' },
          maxBudget: {
            type: 'number',
            description:
              'Brand budget ceiling in INR. Returns creators whose rate min/item price is within this budget.',
          },
          minBudget: {
            type: 'number',
            description: 'Minimum rate floor in INR.',
          },
          complete: { type: 'boolean' },
          instagramConnected: { type: 'boolean' },
          collaborationPreference: {
            type: 'string',
            description: 'paid, barter, affiliate, etc if present in data',
          },
          limit: { type: 'number', description: 'Max rows to return (1-50). Default 15.' },
          sortBy: {
            type: 'string',
            enum: ['newest', 'followers', 'rate_asc', 'rate_desc'],
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_agencies',
      description: 'Search agencies registered on the Viral Flight app.',
      parameters: {
        type: 'object',
        properties: {
          q: { type: 'string' },
          city: { type: 'string' },
          agencyType: { type: 'string' },
          complete: { type: 'boolean' },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_influencer',
      description: 'Get one influencer profile by Mongo id from a previous search result.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'network_stats',
      description: 'Return total counts of influencers, agencies, brands and campaigns.',
      parameters: { type: 'object', properties: {} },
    },
  },
]

export async function runAgentTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case 'search_influencers':
      return searchInfluencersTool(args as InfluencerAgentFilters)
    case 'search_agencies':
      return searchAgenciesTool(args as AgencyAgentFilters)
    case 'get_influencer':
      return getInfluencerByIdTool(String(args.id || ''))
    case 'network_stats':
      return networkStatsTool()
    default:
      return { error: `Unknown tool: ${name}` }
  }
}
