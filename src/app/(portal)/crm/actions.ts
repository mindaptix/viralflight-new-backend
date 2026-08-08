'use server'

import { revalidatePath } from 'next/cache'

import { requireSuperAdmin } from '../lib/auth'
import { CRM_STATUSES, type CrmStatus } from '../lib/format'
import {
  addCrmNote,
  listStaffMembers,
  upsertCrmMeta,
  type CrmRole,
} from './data'

function asStatus(value: FormDataEntryValue | null): CrmStatus | null {
  const text = String(value || '')
  return (CRM_STATUSES as readonly string[]).includes(text)
    ? (text as CrmStatus)
    : null
}

export async function saveCrmMetaAction(formData: FormData) {
  await requireSuperAdmin()
  const profileId = String(formData.get('profileId') || '')
  const role = String(formData.get('role') || '') as CrmRole
  const status = asStatus(formData.get('status'))
  const tagsRaw = String(formData.get('tags') || '')
  const assigneeId = String(formData.get('assigneeId') || '')
  const tags = tagsRaw
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  if (!profileId || !['influencer', 'agency', 'brand'].includes(role)) {
    throw new Error('Invalid CRM target')
  }

  const staff = await listStaffMembers()
  const assignee = staff.find((member) => member.id === assigneeId)

  await upsertCrmMeta({
    profileId,
    role,
    status: status || undefined,
    tags,
    assigneeId,
    assigneeName: assignee?.name || '',
  })

  revalidatePath(`/${role === 'influencer' ? 'influencers' : 'agencies'}/${profileId}`)
  revalidatePath(`/${role === 'influencer' ? 'influencers' : 'agencies'}`)
}

export async function addNoteAction(formData: FormData) {
  const user = await requireSuperAdmin()
  const profileId = String(formData.get('profileId') || '')
  const role = String(formData.get('role') || '') as CrmRole
  const text = String(formData.get('text') || '')

  if (!profileId || !['influencer', 'agency', 'brand'].includes(role)) {
    throw new Error('Invalid CRM target')
  }

  await addCrmNote({
    profileId,
    role,
    text,
    authorId: user.id,
    authorName: user.name || user.email || 'Super Admin',
  })

  revalidatePath(`/${role === 'influencer' ? 'influencers' : 'agencies'}/${profileId}`)
}
