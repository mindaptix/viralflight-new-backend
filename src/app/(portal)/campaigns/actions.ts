'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requireSuperAdmin } from '../lib/auth'
import { suggestCampaignCopy } from './ai'
import {
  addCreatorsToCampaign,
  createVfCampaign,
  dropCreator,
  setAssignmentEmail,
  staffReviewScript,
  staffReviewVideo,
  updateVfCampaign,
  listAssignments,
} from './data'
import { refreshCreatorStats } from './instagram-stats'
import type { VfCampaignStatus } from './constants'

export async function createCampaignAction(formData: FormData) {
  const user = await requireSuperAdmin()
  const platforms = String(formData.get('platforms') || 'instagram')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  const campaign = await createVfCampaign({
    title: String(formData.get('title') || ''),
    clientName: String(formData.get('clientName') || ''),
    brandName: String(formData.get('brandName') || ''),
    description: String(formData.get('description') || ''),
    brief: String(formData.get('brief') || ''),
    category: String(formData.get('category') || ''),
    platforms,
    deliverable: String(formData.get('deliverable') || 'reel'),
    slotsNeeded: Number(formData.get('slotsNeeded') || 1),
    budgetAmount: Number(formData.get('budgetAmount') || 0),
    location: String(formData.get('location') || ''),
    scriptGuidelines: String(formData.get('scriptGuidelines') || ''),
    scriptDeadline: String(formData.get('scriptDeadline') || ''),
    videoDeadline: String(formData.get('videoDeadline') || ''),
    createdBy: user.email || user.name || user.id,
  })

  revalidatePath('/campaigns')
  revalidatePath(`/campaigns/${campaign.id}`)
  redirect(`/campaigns/${campaign.id}`)
}

export async function updateCampaignAction(formData: FormData) {
  await requireSuperAdmin()
  const id = String(formData.get('campaignId') || '')
  await updateVfCampaign(id, {
    title: String(formData.get('title') || ''),
    clientName: String(formData.get('clientName') || ''),
    brandName: String(formData.get('brandName') || ''),
    description: String(formData.get('description') || ''),
    brief: String(formData.get('brief') || ''),
    category: String(formData.get('category') || ''),
    deliverable: String(formData.get('deliverable') || 'reel'),
    slotsNeeded: Number(formData.get('slotsNeeded') || 1),
    budgetAmount: Number(formData.get('budgetAmount') || 0),
    location: String(formData.get('location') || ''),
    scriptGuidelines: String(formData.get('scriptGuidelines') || ''),
    scriptDeadline: String(formData.get('scriptDeadline') || ''),
    videoDeadline: String(formData.get('videoDeadline') || ''),
    status: String(formData.get('status') || 'active') as VfCampaignStatus,
  })
  revalidatePath(`/campaigns/${id}`)
  revalidatePath('/campaigns')
}

export async function addCreatorsAction(formData: FormData) {
  const user = await requireSuperAdmin()
  const campaignId = String(formData.get('campaignId') || '')
  const ids = formData.getAll('influencerId').map((value) => String(value)).filter(Boolean)
  await addCreatorsToCampaign({
    campaignId,
    influencerIds: ids,
    actor: user.email || user.name || 'Staff',
  })
  revalidatePath(`/campaigns/${campaignId}`)
  revalidatePath(`/campaigns/${campaignId}/creators`)
}

export async function saveInviteEmailAction(formData: FormData) {
  await requireSuperAdmin()
  const campaignId = String(formData.get('campaignId') || '')
  await setAssignmentEmail(String(formData.get('assignmentId') || ''), String(formData.get('inviteEmail') || ''))
  revalidatePath(`/campaigns/${campaignId}`)
}

export async function reviewScriptAction(formData: FormData) {
  const user = await requireSuperAdmin()
  const campaignId = String(formData.get('campaignId') || '')
  await staffReviewScript({
    assignmentId: String(formData.get('assignmentId') || ''),
    approve: String(formData.get('decision') || '') === 'approve',
    feedback: String(formData.get('feedback') || ''),
    actor: user.email || user.name || 'Staff',
    videoDeadline: String(formData.get('videoDeadline') || ''),
  })
  revalidatePath(`/campaigns/${campaignId}`)
}

export async function reviewVideoAction(formData: FormData) {
  const user = await requireSuperAdmin()
  const campaignId = String(formData.get('campaignId') || '')
  await staffReviewVideo({
    assignmentId: String(formData.get('assignmentId') || ''),
    approve: String(formData.get('decision') || '') === 'approve',
    feedback: String(formData.get('feedback') || ''),
    actor: user.email || user.name || 'Staff',
  })
  revalidatePath(`/campaigns/${campaignId}`)
}

export async function dropCreatorAction(formData: FormData) {
  const user = await requireSuperAdmin()
  const campaignId = String(formData.get('campaignId') || '')
  await dropCreator(String(formData.get('assignmentId') || ''), user.email || user.name || 'Staff')
  revalidatePath(`/campaigns/${campaignId}`)
}

export async function refreshStatsAction(formData: FormData) {
  await requireSuperAdmin()
  const campaignId = String(formData.get('campaignId') || '')
  const assignmentId = String(formData.get('assignmentId') || '')
  const rows = await listAssignments(campaignId)
  const row = rows.find((item) => item.id === assignmentId)
  if (!row) throw new Error('Assignment not found')
  await refreshCreatorStats(row)
  revalidatePath(`/campaigns/${campaignId}`)
}

export async function suggestCampaignAction(formData: FormData): Promise<{
  title: string
  description: string
  brief: string
  category: string
  scriptGuidelines: string
  deliverable: string
  provider: string
  error?: string
}> {
  await requireSuperAdmin()
  const prompt = String(formData.get('prompt') || '')
  const providerRaw = String(formData.get('provider') || 'auto')
  const provider = providerRaw === 'claude' || providerRaw === 'openai' ? providerRaw : 'auto'
  try {
    const result = await suggestCampaignCopy({ prompt, provider })
    return { ...result.draft, provider: result.provider }
  } catch (error) {
    return {
      title: '',
      description: '',
      brief: '',
      category: '',
      scriptGuidelines: '',
      deliverable: 'reel',
      provider,
      error: error instanceof Error ? error.message : 'AI failed',
    }
  }
}
