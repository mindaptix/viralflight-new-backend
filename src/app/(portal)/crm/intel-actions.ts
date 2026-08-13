'use server'

import { revalidatePath } from 'next/cache'

import { listVfWorkForInfluencer } from '../campaigns/data'
import { requireSuperAdmin } from '../lib/auth'
import { getInfluencerDetail } from './data'
import { researchInfluencerWork } from './intel'

export async function researchInfluencerAction(formData: FormData) {
  await requireSuperAdmin()
  const profileId = String(formData.get('profileId') || '')
  const profile = await getInfluencerDetail(profileId)
  if (!profile) return { error: 'Influencer not found' }

  const ig = profile.instagram as Record<string, unknown>
  const handle = String(ig.handle || '')
  const mediaKit = profile.mediaKit as Record<string, unknown>
  const caseStudies = Array.isArray(mediaKit.caseStudies)
    ? mediaKit.caseStudies.map((item) => {
        const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
        return {
          brand: String(row.brand || ''),
          title: String(row.title || ''),
          result: String(row.result || ''),
          url: String(row.url || ''),
        }
      })
    : []

  try {
    const vfWork = await listVfWorkForInfluencer(profileId)
    await researchInfluencerWork({
      profileId,
      name: profile.name,
      city: profile.city,
      handle,
      niches: profile.niches,
      bio: profile.bio,
      portfolioLink: profile.portfolioLink,
      pastCollaborations: profile.pastCollaborations,
      caseStudies,
      vfWork,
    })
    revalidatePath(`/influencers/${profileId}`)
    return { ok: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Could not research this creator.',
    }
  }
}
