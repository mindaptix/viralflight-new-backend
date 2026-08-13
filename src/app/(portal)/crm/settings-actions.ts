'use server'

import { revalidatePath } from 'next/cache'

import { requireSuperAdmin } from '../lib/auth'
import { saveCrmAiSettings } from './settings'

export async function saveAiSettingsAction(formData: FormData) {
  const user = await requireSuperAdmin()
  const openaiApiKey = String(formData.get('openaiApiKey') || '')
  const openaiModel = String(formData.get('openaiModel') || 'gpt-4o-mini')
  const clearKey = String(formData.get('clearKey') || '') === '1'
  const claudeApiKey = String(formData.get('claudeApiKey') || '')
  const claudeModel = String(formData.get('claudeModel') || 'claude-sonnet-4-5')
  const clearClaudeKey = String(formData.get('clearClaudeKey') || '') === '1'

  await saveCrmAiSettings({
    openaiApiKey,
    openaiModel,
    clearKey,
    claudeApiKey,
    claudeModel,
    clearClaudeKey,
    updatedBy: user.email || user.name || user.id,
  })

  revalidatePath('/settings')
  revalidatePath('/agent')
}
