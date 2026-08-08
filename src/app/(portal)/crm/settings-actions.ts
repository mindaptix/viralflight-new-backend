'use server'

import { revalidatePath } from 'next/cache'

import { requireSuperAdmin } from '../lib/auth'
import { saveCrmAiSettings } from './settings'

export async function saveAiSettingsAction(formData: FormData) {
  const user = await requireSuperAdmin()
  const openaiApiKey = String(formData.get('openaiApiKey') || '')
  const openaiModel = String(formData.get('openaiModel') || 'gpt-4o-mini')
  const clearKey = String(formData.get('clearKey') || '') === '1'

  await saveCrmAiSettings({
    openaiApiKey,
    openaiModel,
    clearKey,
    updatedBy: user.email || user.name || user.id,
  })

  revalidatePath('/settings')
  revalidatePath('/agent')
}
