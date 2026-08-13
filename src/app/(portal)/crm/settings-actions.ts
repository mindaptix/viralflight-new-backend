'use server'

import { revalidatePath } from 'next/cache'

import { requireSuperAdmin } from '../lib/auth'
import { saveCrmAiSettings } from './settings'

export async function saveAiSettingsAction(formData: FormData) {
  const user = await requireSuperAdmin()
  const clearAll = String(formData.get('clearAllKeys') || '') === '1'

  await saveCrmAiSettings({
    openaiApiKey: String(formData.get('openaiApiKey') || ''),
    claudeApiKey: String(formData.get('claudeApiKey') || ''),
    clearKey: clearAll,
    clearClaudeKey: clearAll,
    updatedBy: user.email || user.name || user.id,
  })

  revalidatePath('/settings')
  revalidatePath('/agent')
  revalidatePath('/decks')
}
