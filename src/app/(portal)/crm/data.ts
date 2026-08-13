import mongoose from 'mongoose'
import { ObjectId } from 'mongodb'

import {
  asIso,
  type CrmStatus,
  CRM_STATUSES,
} from '../lib/format'

export type CrmRole = 'influencer' | 'agency' | 'brand'

export type CrmNote = {
  id: string
  text: string
  authorId: string
  authorName: string
  createdAt: string
}

export type CrmRecord = {
  profileId: string
  role: CrmRole
  tags: string[]
  assigneeId: string
  assigneeName: string
  status: CrmStatus
  notes: CrmNote[]
  updatedAt: string
}

export type StaffMember = {
  id: string
  name: string
  email: string
}

function db() {
  const connection = mongoose.connection.db
  if (!connection) throw new Error('Database connection is not ready')
  return connection
}

function toObjectId(id: string) {
  try {
    return new ObjectId(id)
  } catch {
    return null
  }
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  return [
    ...new Set(
      tags
        .map((tag) => String(tag || '').trim())
        .filter(Boolean)
        .map((tag) => tag.slice(0, 40)),
    ),
  ].slice(0, 20)
}

function mapCrm(doc: Record<string, unknown> | null, profileId: string, role: CrmRole): CrmRecord {
  const notesRaw = Array.isArray(doc?.notes) ? doc.notes : []
  const statusRaw = String(doc?.status || 'new')
  const status = (CRM_STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as CrmStatus)
    : 'new'

  return {
    profileId,
    role,
    tags: normalizeTags(doc?.tags),
    assigneeId: String(doc?.assigneeId || ''),
    assigneeName: String(doc?.assigneeName || ''),
    status,
    notes: notesRaw
      .map((note) => {
        if (!note || typeof note !== 'object') return null
        const item = note as Record<string, unknown>
        return {
          id: String(item.id || ''),
          text: String(item.text || ''),
          authorId: String(item.authorId || ''),
          authorName: String(item.authorName || 'Staff'),
          createdAt: asIso(item.createdAt),
        }
      })
      .filter((note): note is CrmNote => Boolean(note?.id && note.text))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    updatedAt: asIso(doc?.updatedAt),
  }
}

export async function getCrmRecord(profileId: string, role: CrmRole): Promise<CrmRecord> {
  const doc = await db().collection('crm_records').findOne({ profileId, role })
  return mapCrm(doc as Record<string, unknown> | null, profileId, role)
}

export async function getCrmRecordsMap(
  role: CrmRole,
  profileIds: string[],
): Promise<Map<string, CrmRecord>> {
  if (!profileIds.length) return new Map()
  const docs = await db()
    .collection('crm_records')
    .find({ role, profileId: { $in: profileIds } })
    .toArray()
  const map = new Map<string, CrmRecord>()
  for (const doc of docs) {
    const profileId = String(doc.profileId || '')
    map.set(profileId, mapCrm(doc as Record<string, unknown>, profileId, role))
  }
  return map
}

export async function listStaffMembers(): Promise<StaffMember[]> {
  const docs = await db()
    .collection('cms_users')
    .find({}, { projection: { name: 1, email: 1 } })
    .sort({ name: 1 })
    .toArray()

  return docs.map((doc) => ({
    id: String(doc._id),
    name: String(doc.name || doc.email || 'Staff'),
    email: String(doc.email || ''),
  }))
}

let indexesReady = false

async function ensureCrmIndexes() {
  if (indexesReady) return
  await db().collection('crm_records').createIndex(
    { profileId: 1, role: 1 },
    { unique: true },
  )
  await db().collection('crm_records').createIndex({ role: 1, status: 1 })
  await db().collection('crm_records').createIndex({ role: 1, assigneeId: 1 })
  indexesReady = true
}

async function crmFilteredIds(
  role: CrmRole,
  status: string,
  assigneeId: string,
): Promise<ObjectId[] | null> {
  if (!status && !assigneeId) return null
  const match: Record<string, unknown> = { role }
  if (status) match.status = status
  if (assigneeId) match.assigneeId = assigneeId
  const docs = await db()
    .collection('crm_records')
    .find(match, { projection: { profileId: 1 } })
    .toArray()
  return docs
    .map((doc) => toObjectId(String(doc.profileId || '')))
    .filter((id): id is ObjectId => Boolean(id))
}

export async function upsertCrmMeta(input: {
  profileId: string
  role: CrmRole
  status?: CrmStatus
  tags?: string[]
  assigneeId?: string
  assigneeName?: string
}) {
  await ensureCrmIndexes()
  const now = new Date()

  await db().collection('crm_records').updateOne(
    { profileId: input.profileId, role: input.role },
    {
      $set: {
        profileId: input.profileId,
        role: input.role,
        updatedAt: now,
        status: input.status || 'new',
        tags: normalizeTags(input.tags || []),
        assigneeId: input.assigneeId || '',
        assigneeName: input.assigneeName || '',
      },
      $setOnInsert: {
        notes: [],
        createdAt: now,
      },
    },
    { upsert: true },
  )
}

export async function addCrmNote(input: {
  profileId: string
  role: CrmRole
  text: string
  authorId: string
  authorName: string
}) {
  await ensureCrmIndexes()
  const text = input.text.trim()
  if (!text) throw new Error('Note text is required')
  const now = new Date()
  const note = {
    id: new ObjectId().toString(),
    text: text.slice(0, 2000),
    authorId: input.authorId,
    authorName: input.authorName || 'Staff',
    createdAt: now,
  }

  await db().collection('crm_records').updateOne(
    { profileId: input.profileId, role: input.role },
    {
      $push: { notes: { $each: [note], $position: 0 } } as never,
      $set: { updatedAt: now },
      $setOnInsert: {
        profileId: input.profileId,
        role: input.role,
        tags: [],
        status: 'new',
        assigneeId: '',
        assigneeName: '',
        createdAt: now,
      },
    } as never,
    { upsert: true },
  )
}

export type InfluencerListFilters = {
  q: string
  city: string
  niche: string
  completion: 'all' | 'complete' | 'incomplete'
  instagram: 'all' | 'connected' | 'not_connected'
  status: string
  assigneeId: string
  page: number
  pageSize: number
}

export type InfluencerListItem = {
  id: string
  name: string
  mobile: string
  city: string
  niches: string[]
  complete: boolean
  instagramConnected: boolean
  followers: number
  managerName: string
  managerMobile: string
  photoUrl: string
  handle: string
  createdAt: string
  crm: CrmRecord
}

function photoFromDoc(doc: Record<string, unknown>) {
  const ig =
    doc.instagram && typeof doc.instagram === 'object'
      ? (doc.instagram as Record<string, unknown>)
      : null
  const mediaKit =
    doc.mediaKit && typeof doc.mediaKit === 'object'
      ? (doc.mediaKit as Record<string, unknown>)
      : null
  const portfolio = Array.isArray(mediaKit?.portfolioImages)
    ? mediaKit.portfolioImages
    : []
  return String(
    doc.profileImageUrl || ig?.profilePictureUrl || portfolio[0] || '',
  )
}

function handleFromDoc(doc: Record<string, unknown>) {
  const ig =
    doc.instagram && typeof doc.instagram === 'object'
      ? (doc.instagram as Record<string, unknown>)
      : null
  if (ig?.handle) return String(ig.handle)
  const platforms = Array.isArray(doc.platforms) ? doc.platforms : []
  for (const platform of platforms) {
    if (!platform || typeof platform !== 'object') continue
    const item = platform as Record<string, unknown>
    const handle = String(item.username || item.channelName || '')
    if (handle) return handle
  }
  return ''
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
  const ig = doc.instagram && typeof doc.instagram === 'object'
    ? (doc.instagram as Record<string, unknown>)
    : null
  const igFollowers = Number(ig?.followers ?? 0)
  if (Number.isFinite(igFollowers) && igFollowers > max) max = igFollowers
  return max
}

export async function listInfluencers(filters: InfluencerListFilters) {
  const match: Record<string, unknown> = {}
  if (filters.city) match.city = filters.city
  if (filters.completion === 'complete') match.isProfileComplete = true
  if (filters.completion === 'incomplete') match.isProfileComplete = { $ne: true }
  if (filters.instagram === 'connected') match['instagram.isConnected'] = true
  if (filters.instagram === 'not_connected') {
    match['instagram.isConnected'] = { $ne: true }
  }
  if (filters.niche) match.contentCategories = filters.niche

  const crmIds = await crmFilteredIds('influencer', filters.status, filters.assigneeId)
  if (crmIds) {
    if (!crmIds.length) {
      return {
        total: 0,
        page: Math.max(1, filters.page || 1),
        pageSize: Math.min(100, Math.max(10, filters.pageSize || 25)),
        rows: [] as InfluencerListItem[],
      }
    }
    match._id = { $in: crmIds }
  }

  const q = filters.q.trim()
  if (q) {
    const rx = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
    match.$or = [
      { name: rx },
      { mobile: rx },
      { bio: rx },
      { managerName: rx },
      { managerMobile: rx },
      { 'platforms.username': rx },
      { 'instagram.handle': rx },
    ]
  }

  const page = Math.max(1, filters.page || 1)
  const pageSize = Math.min(100, Math.max(10, filters.pageSize || 25))
  const skip = (page - 1) * pageSize

  const collection = db().collection('influencer_profiles')
  const [total, docs] = await Promise.all([
    collection.countDocuments(match),
    collection.find(match).sort({ createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
  ])

  const crmMap = await getCrmRecordsMap(
    'influencer',
    docs.map((doc) => String(doc._id)),
  )

  const rows: InfluencerListItem[] = docs.map((doc) => {
    const id = String(doc._id)
    const crm = crmMap.get(id) || mapCrm(null, id, 'influencer')
    return {
      id,
      name: String(doc.name || 'Unnamed creator'),
      mobile: String(doc.mobile || ''),
      city: String(doc.city || ''),
      niches: Array.isArray(doc.contentCategories)
        ? doc.contentCategories.map(String)
        : [],
      complete: doc.isProfileComplete === true,
      instagramConnected: Boolean(
        doc.instagram && typeof doc.instagram === 'object'
          ? (doc.instagram as { isConnected?: boolean }).isConnected
          : false,
      ),
      followers: followersFromDoc(doc as Record<string, unknown>),
      managerName: String(doc.managerName || ''),
      managerMobile: String(doc.managerMobile || ''),
      photoUrl: photoFromDoc(doc as Record<string, unknown>),
      handle: handleFromDoc(doc as Record<string, unknown>),
      createdAt: asIso(doc.createdAt),
      crm,
    }
  })

  return {
    total,
    page,
    pageSize,
    rows,
  }
}

export async function getCreatorInsightBuckets() {
  const collection = db().collection('influencer_profiles')
  const [cities, niches] = await Promise.all([
    collection
      .aggregate([
        { $match: { city: { $nin: [null, ''] } } },
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ])
      .toArray(),
    collection
      .aggregate([
        { $unwind: '$contentCategories' },
        { $group: { _id: '$contentCategories', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ])
      .toArray(),
  ])
  return {
    cities: cities.map((row) => ({
      label: String(row._id || 'Unknown'),
      value: Number(row.count || 0),
    })),
    niches: niches.map((row) => ({
      label: String(row._id || 'Other'),
      value: Number(row.count || 0),
    })),
  }
}

export async function getInfluencerDetail(id: string) {
  const objectId = toObjectId(id)
  if (!objectId) return null
  const doc = await db().collection('influencer_profiles').findOne({ _id: objectId })
  if (!doc) return null
  const crm = await getCrmRecord(id, 'influencer')
  const platforms = Array.isArray(doc.platforms) ? doc.platforms : []
  const instagram =
    doc.instagram && typeof doc.instagram === 'object'
      ? (doc.instagram as Record<string, unknown>)
      : {}

  return {
    id,
    name: String(doc.name || 'Unnamed creator'),
    mobile: String(doc.mobile || ''),
    city: String(doc.city || ''),
    bio: String(doc.bio || ''),
    profession: String(doc.profession || ''),
    niches: Array.isArray(doc.contentCategories) ? doc.contentCategories.map(String) : [],
    languages: Array.isArray(doc.contentLanguages) ? doc.contentLanguages.map(String) : [],
    complete: doc.isProfileComplete === true,
    portfolioLink: String(doc.portfolioLink || ''),
    collaborationPreference: String(doc.collaborationPreference || ''),
    rateRange: doc.rateRange || {},
    managerName: String(doc.managerName || ''),
    managerMobile: String(doc.managerMobile || ''),
    youtubeHandle: String(doc.youtubeHandle || ''),
    profileImageUrl: photoFromDoc(doc as Record<string, unknown>),
    instagram,
    platforms,
    followers: followersFromDoc(doc as Record<string, unknown>),
    createdAt: asIso(doc.createdAt),
    updatedAt: asIso(doc.updatedAt),
    crm,
    pastCollaborations: Array.isArray(doc.pastCollaborations)
      ? doc.pastCollaborations.map(String)
      : [],
    mediaKit:
      doc.mediaKit && typeof doc.mediaKit === 'object'
        ? (doc.mediaKit as Record<string, unknown>)
        : {},
  }
}

export type AgencyListFilters = {
  q: string
  city: string
  agencyType: string
  completion: 'all' | 'complete' | 'incomplete'
  status: string
  assigneeId: string
  page: number
  pageSize: number
}

export type AgencyListItem = {
  id: string
  name: string
  mobile: string
  city: string
  agencyType: string
  contactPerson: string
  focusAreas: string[]
  complete: boolean
  website: string
  createdAt: string
  crm: CrmRecord
}

export async function listAgencies(filters: AgencyListFilters) {
  const match: Record<string, unknown> = {}
  if (filters.city) match.city = filters.city
  if (filters.agencyType) match.agencyType = filters.agencyType
  if (filters.completion === 'complete') match.isProfileComplete = true
  if (filters.completion === 'incomplete') match.isProfileComplete = { $ne: true }

  const crmIds = await crmFilteredIds('agency', filters.status, filters.assigneeId)
  if (crmIds) {
    if (!crmIds.length) {
      return {
        total: 0,
        page: Math.max(1, filters.page || 1),
        pageSize: Math.min(100, Math.max(10, filters.pageSize || 25)),
        rows: [] as AgencyListItem[],
      }
    }
    match._id = { $in: crmIds }
  }

  const q = filters.q.trim()
  if (q) {
    const rx = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
    match.$or = [
      { agencyName: rx },
      { mobile: rx },
      { contactPerson: rx },
      { contactName: rx },
      { website: rx },
      { description: rx },
      { bio: rx },
    ]
  }

  const page = Math.max(1, filters.page || 1)
  const pageSize = Math.min(100, Math.max(10, filters.pageSize || 25))
  const skip = (page - 1) * pageSize
  const collection = db().collection('agency_profiles')

  const [total, docs] = await Promise.all([
    collection.countDocuments(match),
    collection.find(match).sort({ createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
  ])

  const crmMap = await getCrmRecordsMap(
    'agency',
    docs.map((doc) => String(doc._id)),
  )

  const rows: AgencyListItem[] = docs.map((doc) => {
    const id = String(doc._id)
    const crm = crmMap.get(id) || mapCrm(null, id, 'agency')
    return {
      id,
      name: String(doc.agencyName || 'Unnamed agency'),
      mobile: String(doc.mobile || ''),
      city: String(doc.city || ''),
      agencyType: String(doc.agencyType || ''),
      contactPerson: String(doc.contactPerson || doc.contactName || ''),
      focusAreas: Array.isArray(doc.focusAreas)
        ? doc.focusAreas.map(String)
        : Array.isArray(doc.niches)
          ? doc.niches.map(String)
          : [],
      complete: doc.isProfileComplete === true,
      website: String(doc.website || ''),
      createdAt: asIso(doc.createdAt),
      crm,
    }
  })

  return { total, page, pageSize, rows }
}

export async function getAgencyDetail(id: string) {
  const objectId = toObjectId(id)
  if (!objectId) return null
  const doc = await db().collection('agency_profiles').findOne({ _id: objectId })
  if (!doc) return null
  const crm = await getCrmRecord(id, 'agency')

  return {
    id,
    name: String(doc.agencyName || 'Unnamed agency'),
    mobile: String(doc.mobile || ''),
    city: String(doc.city || ''),
    agencyType: String(doc.agencyType || ''),
    teamSize: String(doc.teamSize || ''),
    creatorsManaged: String(doc.creatorsManaged || ''),
    contactPerson: String(doc.contactPerson || doc.contactName || ''),
    website: String(doc.website || ''),
    bio: String(doc.bio || doc.description || ''),
    focusAreas: Array.isArray(doc.focusAreas)
      ? doc.focusAreas.map(String)
      : Array.isArray(doc.niches)
        ? doc.niches.map(String)
        : [],
    complete: doc.isProfileComplete === true,
    profileImageUrl: String(doc.profileImageUrl || ''),
    createdAt: asIso(doc.createdAt),
    updatedAt: asIso(doc.updatedAt),
    crm,
  }
}
