'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requireSuperAdmin } from '../lib/auth'
import { formatNumber } from '../lib/format'
import { getVfCampaign, listAssignments } from '../campaigns/data'
import { generateClientDeckOutline } from './ai'
import { saveClientDeck } from './data'

function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return formatNumber(value)
}

async function campaignContext(campaignId: string) {
  if (!campaignId) return { text: '', title: '', clientName: '' }
  const campaign = await getVfCampaign(campaignId)
  if (!campaign) return { text: '', title: '', clientName: '' }
  const rows = await listAssignments(campaignId)
  const active = rows.filter((row) => row.status !== 'dropped')
  const totals = active.reduce(
    (sum, row) => ({
      views: sum.views + (row.stats?.views || 0),
      likes: sum.likes + (row.stats?.likes || 0),
      reach: sum.reach + (row.stats?.reach || 0),
    }),
    { views: 0, likes: 0, reach: 0 },
  )
  const creators = active
    .map((row) => `${row.name} (${row.city || 'India'}) — ${row.status}`)
    .join('\n')
  const text = [
    `Title: ${campaign.title}`,
    `Client: ${campaign.clientName || campaign.brandName}`,
    `Brand: ${campaign.brandName}`,
    `Status: ${campaign.status}`,
    `Category: ${campaign.category}`,
    `Deliverable: ${campaign.slotsNeeded} ${campaign.deliverable}s`,
    `Location: ${campaign.location || 'Pan India'}`,
    `Budget: ₹${formatNumber(campaign.budgetAmount)}`,
    `Video deadline: ${campaign.videoDeadline || 'TBD'}`,
    campaign.description ? `Description: ${campaign.description}` : '',
    campaign.brief ? `Brief: ${campaign.brief}` : '',
    campaign.scriptGuidelines ? `Script guidelines: ${campaign.scriptGuidelines}` : '',
    `Creators:\n${creators || 'Not assigned yet'}`,
    `Live stats: reach ${compact(totals.reach)}, views ${compact(totals.views)}, likes ${compact(totals.likes)}`,
    `Client live link: ${campaign.clientUrl}`,
  ]
    .filter(Boolean)
    .join('\n')

  return {
    text,
    title: campaign.title,
    clientName: campaign.clientName || campaign.brandName,
  }
}

export async function generateDeckAction(formData: FormData) {
  const user = await requireSuperAdmin()
  const clientName = String(formData.get('clientName') || '').trim()
  const notes = String(formData.get('notes') || '').trim()
  const campaignId = String(formData.get('campaignId') || '').trim()

  if (!clientName && !campaignId && !notes) {
    return { error: 'Add a client name, pick a campaign, or write notes for the deck.' }
  }

  try {
    const campaign = await campaignContext(campaignId)
    const { outline } = await generateClientDeckOutline({
      clientName: clientName || campaign.clientName,
      notes,
      campaignContext: campaign.text,
    })
    const deck = await saveClientDeck({
      outline: {
        ...outline,
        clientName: outline.clientName || clientName || campaign.clientName,
      },
      campaignId,
      campaignTitle: campaign.title,
      notes,
      provider: 'ai',
      createdBy: user.email || user.name || user.id,
    })
    revalidatePath('/decks')
    redirect(`/decks/${deck.id}`)
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      String((error as { digest?: string }).digest || '').startsWith('NEXT_REDIRECT')
    ) {
      throw error
    }
    return {
      error: error instanceof Error ? error.message : 'Could not generate the PPT.',
    }
  }
}
