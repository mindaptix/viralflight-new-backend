import crypto from 'crypto'
import { ObjectId } from 'mongodb'
import mongoose from 'mongoose'

import { asIso } from '../lib/format'
import {
  CAMPAIGN_STATUSES,
  CREATOR_STATUSES,
  type CreatorStatus,
  type VfCampaignStatus,
  publicOrigin,
} from './constants'

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

function token() {
  return crypto.randomBytes(18).toString('hex')
}

export type HistoryItem = {
  at: string
  actor: string
  action: string
  note: string
}

export type IgStats = {
  views: number
  likes: number
  comments: number
  reach: number
  engagementRate: number
  fetchedAt: string
  source: string
  note: string
}

export type VfCampaign = {
  id: string
  title: string
  clientName: string
  brandName: string
  description: string
  brief: string
  category: string
  platforms: string[]
  deliverable: string
  slotsNeeded: number
  budgetAmount: number
  location: string
  scriptGuidelines: string
  scriptDeadline: string
  videoDeadline: string
  status: VfCampaignStatus
  clientToken: string
  clientUrl: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type VfAssignment = {
  id: string
  campaignId: string
  influencerId: string
  name: string
  mobile: string
  city: string
  inviteEmail: string
  inviteToken: string
  inviteUrl: string
  status: CreatorStatus
  scriptText: string
  scriptFeedback: string
  videoUrl: string
  videoFeedback: string
  videoDeadline: string
  instagramUrl: string
  stats: IgStats | null
  history: HistoryItem[]
  createdAt: string
  updatedAt: string
}

function mapCampaign(doc: Record<string, unknown>): VfCampaign {
  const clientToken = String(doc.clientToken || '')
  const statusRaw = String(doc.status || 'draft')
  const status = (CAMPAIGN_STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as VfCampaignStatus)
    : 'draft'
  return {
    id: String(doc._id),
    title: String(doc.title || 'Untitled campaign'),
    clientName: String(doc.clientName || ''),
    brandName: String(doc.brandName || ''),
    description: String(doc.description || ''),
    brief: String(doc.brief || ''),
    category: String(doc.category || ''),
    platforms: Array.isArray(doc.platforms) ? doc.platforms.map(String) : ['instagram'],
    deliverable: String(doc.deliverable || 'reel'),
    slotsNeeded: Number(doc.slotsNeeded || 0),
    budgetAmount: Number(doc.budgetAmount || 0),
    location: String(doc.location || ''),
    scriptGuidelines: String(doc.scriptGuidelines || ''),
    scriptDeadline: asIso(doc.scriptDeadline),
    videoDeadline: asIso(doc.videoDeadline),
    status,
    clientToken,
    clientUrl: clientToken ? `${publicOrigin()}/c/${clientToken}` : '',
    createdBy: String(doc.createdBy || ''),
    createdAt: asIso(doc.createdAt),
    updatedAt: asIso(doc.updatedAt),
  }
}

function mapStats(raw: unknown): IgStats | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  return {
    views: Number(item.views || 0),
    likes: Number(item.likes || 0),
    comments: Number(item.comments || 0),
    reach: Number(item.reach || 0),
    engagementRate: Number(item.engagementRate || 0),
    fetchedAt: asIso(item.fetchedAt),
    source: String(item.source || ''),
    note: String(item.note || ''),
  }
}

function mapAssignment(doc: Record<string, unknown>): VfAssignment {
  const inviteToken = String(doc.inviteToken || '')
  const statusRaw = String(doc.status || 'invited')
  const status = (CREATOR_STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as CreatorStatus)
    : 'invited'
  const historyRaw = Array.isArray(doc.history) ? doc.history : []
  return {
    id: String(doc._id),
    campaignId: String(doc.campaignId || ''),
    influencerId: String(doc.influencerId || ''),
    name: String(doc.name || 'Creator'),
    mobile: String(doc.mobile || ''),
    city: String(doc.city || ''),
    inviteEmail: String(doc.inviteEmail || ''),
    inviteToken,
    inviteUrl: inviteToken ? `${publicOrigin()}/i/${inviteToken}` : '',
    status,
    scriptText: String(doc.scriptText || ''),
    scriptFeedback: String(doc.scriptFeedback || ''),
    videoUrl: String(doc.videoUrl || ''),
    videoFeedback: String(doc.videoFeedback || ''),
    videoDeadline: asIso(doc.videoDeadline),
    instagramUrl: String(doc.instagramUrl || ''),
    stats: mapStats(doc.stats),
    history: historyRaw
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null
        const item = entry as Record<string, unknown>
        return {
          at: asIso(item.at),
          actor: String(item.actor || 'Staff'),
          action: String(item.action || ''),
          note: String(item.note || ''),
        }
      })
      .filter((item): item is HistoryItem => Boolean(item?.action)),
    createdAt: asIso(doc.createdAt),
    updatedAt: asIso(doc.updatedAt),
  }
}

export async function listVfCampaigns() {
  const docs = await db()
    .collection('vf_campaigns')
    .find({})
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray()
  return docs.map((doc) => mapCampaign(doc as Record<string, unknown>))
}

export async function listVfWorkForInfluencer(influencerId: string) {
  const docs = await db()
    .collection('vf_campaign_creators')
    .find({ influencerId })
    .sort({ updatedAt: -1 })
    .toArray()
  const campaignIds = [
    ...new Set(docs.map((doc) => String(doc.campaignId || '')).filter(Boolean)),
  ]
  const objectIds = campaignIds.map(toObjectId).filter((id): id is ObjectId => Boolean(id))
  const campaigns = objectIds.length
    ? await db()
        .collection('vf_campaigns')
        .find({ _id: { $in: objectIds } })
        .toArray()
    : []
  const campaignMap = new Map(
    campaigns.map((doc) => [String(doc._id), mapCampaign(doc as Record<string, unknown>)]),
  )
  return docs.map((doc) => {
    const assignment = mapAssignment(doc as Record<string, unknown>)
    const campaign = campaignMap.get(assignment.campaignId)
    return {
      assignmentId: assignment.id,
      campaignId: assignment.campaignId,
      campaignTitle: campaign?.title || 'Campaign',
      clientName: campaign?.clientName || campaign?.brandName || 'Viral Flight client',
      status: assignment.status,
      instagramUrl: assignment.instagramUrl,
      href: campaign ? `/campaigns/${campaign.id}` : '/campaigns',
    }
  })
}

export async function getVfCampaign(id: string) {
  const objectId = toObjectId(id)
  if (!objectId) return null
  const doc = await db().collection('vf_campaigns').findOne({ _id: objectId })
  return doc ? mapCampaign(doc as Record<string, unknown>) : null
}

export async function getVfCampaignByClientToken(clientToken: string) {
  const doc = await db().collection('vf_campaigns').findOne({ clientToken })
  return doc ? mapCampaign(doc as Record<string, unknown>) : null
}

export async function createVfCampaign(input: {
  title: string
  clientName: string
  brandName: string
  description: string
  brief: string
  category: string
  platforms: string[]
  deliverable: string
  slotsNeeded: number
  budgetAmount: number
  location: string
  scriptGuidelines: string
  scriptDeadline?: string
  videoDeadline?: string
  createdBy: string
}) {
  const now = new Date()
  const clientToken = token()
  const doc = {
    title: input.title.trim() || 'Untitled campaign',
    clientName: input.clientName.trim(),
    brandName: input.brandName.trim(),
    description: input.description.trim(),
    brief: input.brief.trim(),
    category: input.category.trim() || 'Lifestyle',
    platforms: input.platforms.length ? input.platforms : ['instagram'],
    deliverable: input.deliverable || 'reel',
    slotsNeeded: Math.max(1, Number(input.slotsNeeded) || 1),
    budgetAmount: Math.max(0, Number(input.budgetAmount) || 0),
    location: input.location.trim(),
    scriptGuidelines: input.scriptGuidelines.trim(),
    scriptDeadline: input.scriptDeadline ? new Date(input.scriptDeadline) : null,
    videoDeadline: input.videoDeadline ? new Date(input.videoDeadline) : null,
    status: 'draft' as VfCampaignStatus,
    clientToken,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  }
  const result = await db().collection('vf_campaigns').insertOne(doc)
  return mapCampaign({ ...doc, _id: result.insertedId })
}

export async function updateVfCampaign(
  id: string,
  patch: Partial<{
    title: string
    clientName: string
    brandName: string
    description: string
    brief: string
    category: string
    deliverable: string
    slotsNeeded: number
    budgetAmount: number
    location: string
    scriptGuidelines: string
    scriptDeadline: string
    videoDeadline: string
    status: VfCampaignStatus
  }>,
) {
  const objectId = toObjectId(id)
  if (!objectId) throw new Error('Invalid campaign')
  const $set: Record<string, unknown> = { updatedAt: new Date() }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    if (key === 'scriptDeadline' || key === 'videoDeadline') {
      $set[key] = value ? new Date(String(value)) : null
      continue
    }
    $set[key] = value
  }
  await db().collection('vf_campaigns').updateOne({ _id: objectId }, { $set })
  return getVfCampaign(id)
}

export async function listAssignments(campaignId: string) {
  const docs = await db()
    .collection('vf_campaign_creators')
    .find({ campaignId })
    .sort({ createdAt: 1 })
    .toArray()
  return docs.map((doc) => mapAssignment(doc as Record<string, unknown>))
}

export async function getAssignmentByInvite(inviteToken: string) {
  const doc = await db().collection('vf_campaign_creators').findOne({ inviteToken })
  if (!doc) return null
  const assignment = mapAssignment(doc as Record<string, unknown>)
  const campaign = await getVfCampaign(assignment.campaignId)
  if (!campaign) return null
  return { assignment, campaign }
}

export async function addCreatorsToCampaign(input: {
  campaignId: string
  influencerIds: string[]
  actor: string
}) {
  const campaign = await getVfCampaign(input.campaignId)
  if (!campaign) throw new Error('Campaign not found')
  const existing = await listAssignments(input.campaignId)
  const already = new Set(existing.map((row) => row.influencerId))
  const remainingSlots = Math.max(0, campaign.slotsNeeded - existing.length)
  const ids = input.influencerIds.filter((id) => !already.has(id)).slice(0, remainingSlots)
  if (!ids.length) return { added: 0, remainingSlots }

  const objectIds = ids.map(toObjectId).filter((id): id is ObjectId => Boolean(id))
  const profiles = await db()
    .collection('influencer_profiles')
    .find({ _id: { $in: objectIds } })
    .toArray()

  const now = new Date()
  const docs = profiles.map((profile) => ({
    campaignId: input.campaignId,
    influencerId: String(profile._id),
    name: String(profile.name || 'Creator'),
    mobile: String(profile.mobile || ''),
    city: String(profile.city || ''),
    inviteEmail: '',
    inviteToken: token(),
    status: 'invited',
    scriptText: '',
    scriptFeedback: '',
    videoUrl: '',
    videoFeedback: '',
    videoDeadline: campaign.videoDeadline ? new Date(campaign.videoDeadline) : null,
    instagramUrl: '',
    stats: null,
    history: [
      {
        at: now,
        actor: input.actor,
        action: 'invited',
        note: 'Selected for this Viral Flight campaign',
      },
    ],
    createdAt: now,
    updatedAt: now,
  }))

  if (docs.length) {
    await db().collection('vf_campaign_creators').insertMany(docs)
    if (campaign.status === 'draft') {
      await updateVfCampaign(campaign.id, { status: 'active' })
    }
  }

  return { added: docs.length, remainingSlots: remainingSlots - docs.length }
}

export async function setAssignmentEmail(id: string, inviteEmail: string) {
  const objectId = toObjectId(id)
  if (!objectId) throw new Error('Invalid assignment')
  await db().collection('vf_campaign_creators').updateOne(
    { _id: objectId },
    { $set: { inviteEmail: inviteEmail.trim(), updatedAt: new Date() } },
  )
}

async function pushHistory(
  objectId: ObjectId,
  actor: string,
  action: string,
  note: string,
  extra: Record<string, unknown> = {},
) {
  const now = new Date()
  await db().collection('vf_campaign_creators').updateOne(
    { _id: objectId },
    {
      $set: { ...extra, updatedAt: now },
      $push: {
        history: { at: now, actor, action, note },
      } as never,
    } as never,
  )
}

export async function creatorSubmitScript(inviteToken: string, scriptText: string) {
  const found = await getAssignmentByInvite(inviteToken)
  if (!found) throw new Error('Invite not found')
  const allowed: CreatorStatus[] = ['invited', 'script_changes']
  if (!allowed.includes(found.assignment.status)) {
    throw new Error('Script cannot be submitted in the current stage')
  }
  const objectId = toObjectId(found.assignment.id)
  if (!objectId) throw new Error('Invalid assignment')
  await pushHistory(objectId, found.assignment.name, 'script_submitted', 'Creator submitted a script', {
    status: 'script_submitted',
    scriptText: scriptText.trim().slice(0, 8000),
  })
}

export async function staffReviewScript(input: {
  assignmentId: string
  approve: boolean
  feedback: string
  actor: string
  videoDeadline?: string
}) {
  const objectId = toObjectId(input.assignmentId)
  if (!objectId) throw new Error('Invalid assignment')
  if (input.approve) {
    await pushHistory(objectId, input.actor, 'script_approved', input.feedback || 'Script approved', {
      status: 'script_approved',
      scriptFeedback: '',
      videoDeadline: input.videoDeadline ? new Date(input.videoDeadline) : undefined,
    })
  } else {
    await pushHistory(
      objectId,
      input.actor,
      'script_changes',
      input.feedback || 'Please revise the script',
      {
        status: 'script_changes',
        scriptFeedback: input.feedback.trim().slice(0, 4000),
      },
    )
  }
}

export async function creatorSubmitVideo(inviteToken: string, videoUrl: string) {
  const found = await getAssignmentByInvite(inviteToken)
  if (!found) throw new Error('Invite not found')
  const allowed: CreatorStatus[] = ['script_approved', 'video_changes']
  if (!allowed.includes(found.assignment.status)) {
    throw new Error('Video cannot be submitted until the script is approved')
  }
  const objectId = toObjectId(found.assignment.id)
  if (!objectId) throw new Error('Invalid assignment')
  await pushHistory(objectId, found.assignment.name, 'video_submitted', 'Creator submitted video', {
    status: 'video_submitted',
    videoUrl: videoUrl.trim().slice(0, 500),
  })
}

export async function staffReviewVideo(input: {
  assignmentId: string
  approve: boolean
  feedback: string
  actor: string
}) {
  const objectId = toObjectId(input.assignmentId)
  if (!objectId) throw new Error('Invalid assignment')
  if (input.approve) {
    await pushHistory(objectId, input.actor, 'video_approved', input.feedback || 'Video approved — post on Instagram', {
      status: 'video_approved',
      videoFeedback: '',
    })
  } else {
    await pushHistory(
      objectId,
      input.actor,
      'video_changes',
      input.feedback || 'Please revise the video',
      {
        status: 'video_changes',
        videoFeedback: input.feedback.trim().slice(0, 4000),
      },
    )
  }
}

export async function creatorSubmitInstagram(inviteToken: string, instagramUrl: string) {
  const found = await getAssignmentByInvite(inviteToken)
  if (!found) throw new Error('Invite not found')
  if (found.assignment.status !== 'video_approved' && found.assignment.status !== 'live') {
    throw new Error('Instagram link can be added after video approval')
  }
  const objectId = toObjectId(found.assignment.id)
  if (!objectId) throw new Error('Invalid assignment')
  await pushHistory(objectId, found.assignment.name, 'instagram_submitted', instagramUrl, {
    status: 'live',
    instagramUrl: instagramUrl.trim().slice(0, 500),
  })
}

export async function saveAssignmentStats(assignmentId: string, stats: IgStats) {
  const objectId = toObjectId(assignmentId)
  if (!objectId) throw new Error('Invalid assignment')
  await db().collection('vf_campaign_creators').updateOne(
    { _id: objectId },
    { $set: { stats, updatedAt: new Date() } },
  )
}

export async function dropCreator(assignmentId: string, actor: string) {
  const objectId = toObjectId(assignmentId)
  if (!objectId) throw new Error('Invalid assignment')
  await pushHistory(objectId, actor, 'dropped', 'Removed from campaign', { status: 'dropped' })
}

export function whatsappInviteUrl(assignment: VfAssignment, campaignTitle: string) {
  const mobile = assignment.mobile.replace(/\D/g, '')
  if (!mobile) return ''
  const phone = mobile.startsWith('91') ? mobile : `91${mobile}`
  const text = `Hi ${assignment.name}, Viral Flight invited you to campaign "${campaignTitle}". Submit script here: ${assignment.inviteUrl}`
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

export function mailtoInviteUrl(assignment: VfAssignment, campaignTitle: string) {
  const to = assignment.inviteEmail || ''
  const subject = `Viral Flight campaign: ${campaignTitle}`
  const body = `Hi ${assignment.name},\n\nYou are invited to a Viral Flight campaign.\nOpen your workspace:\n${assignment.inviteUrl}\n`
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
