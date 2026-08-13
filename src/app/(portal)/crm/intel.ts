import mongoose from 'mongoose'

import { asIso } from '../lib/format'
import { completeClaudeResearch } from './ai-complete'

export type BrandCollab = {
  name: string
  category: string
  work: string
  year: string
  url: string
  confidence: 'confirmed' | 'likely'
  source: 'viral-flight' | 'profile' | 'research'
}

export type WorkItem = {
  title: string
  type: string
  summary: string
  url: string
}

export type InfluencerIntel = {
  profileId: string
  summary: string
  brandCount: number
  brands: BrandCollab[]
  work: WorkItem[]
  researchedAt: string
}

function db() {
  const connection = mongoose.connection.db
  if (!connection) throw new Error('Database connection is not ready')
  return connection
}

function mapIntel(doc: Record<string, unknown>): InfluencerIntel {
  const brandsRaw = Array.isArray(doc.brands) ? doc.brands : []
  const workRaw = Array.isArray(doc.work) ? doc.work : []
  return {
    profileId: String(doc.profileId || ''),
    summary: String(doc.summary || ''),
    brandCount: Number(doc.brandCount || brandsRaw.length),
    brands: brandsRaw.map((item) => {
      const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
      const confidence = row.confidence === 'likely' ? 'likely' : 'confirmed'
      const source =
        row.source === 'viral-flight' || row.source === 'profile' ? row.source : 'research'
      return {
        name: String(row.name || ''),
        category: String(row.category || ''),
        work: String(row.work || ''),
        year: String(row.year || ''),
        url: String(row.url || ''),
        confidence,
        source,
      }
    }),
    work: workRaw.map((item) => {
      const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
      return {
        title: String(row.title || ''),
        type: String(row.type || 'campaign'),
        summary: String(row.summary || ''),
        url: String(row.url || ''),
      }
    }),
    researchedAt: asIso(doc.researchedAt),
  }
}

export async function getInfluencerIntel(profileId: string) {
  const doc = await db().collection('vf_influencer_intel').findOne({ profileId })
  return doc ? mapIntel(doc as Record<string, unknown>) : null
}

const SYSTEM = `You research Indian influencer brand collaborations for Viral Flight CRM.
Return ONLY valid JSON:
{
  "summary": string,
  "brands": [
    { "name": string, "category": string, "work": string, "year": string, "url": string, "confidence": "confirmed"|"likely" }
  ],
  "work": [
    { "title": string, "type": "reel"|"campaign"|"series"|"video"|"other", "summary": string, "url": string }
  ]
}
Rules:
- Focus on brands this creator has actually collaborated with, plus notable public work.
- work field = what they made (reel, unboxing, ambassador, event).
- Do not invent. If a collab is not clearly documented, confidence=likely.
- Prefer Instagram posts, press, brand pages. Include URLs when found.
- Ignore unrelated people with similar names; match city/handle/niche.
- Max 12 brands and 10 work items.`

function parseIntel(text: string, profileId: string): InfluencerIntel {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('AI could not structure brand research')
  let json: Record<string, unknown>
  try {
    json = JSON.parse(match[0]) as Record<string, unknown>
  } catch {
    throw new Error('AI could not structure brand research')
  }
  const mapped = mapIntel({
    profileId,
    summary: json.summary,
    brands: json.brands,
    work: json.work,
    researchedAt: new Date().toISOString(),
  })
  mapped.brands = mapped.brands.map((brand) => ({ ...brand, source: 'research' }))
  mapped.brandCount = mapped.brands.length
  return mapped
}

export async function researchInfluencerWork(input: {
  profileId: string
  name: string
  city: string
  handle: string
  niches: string[]
  bio: string
  portfolioLink: string
  pastCollaborations: string[]
  caseStudies: Array<{ brand?: string; title?: string; result?: string; url?: string }>
  vfWork: Array<{ clientName: string; campaignTitle: string; status: string; instagramUrl: string }>
}) {
  const vfBrands: BrandCollab[] = input.vfWork.map((row) => ({
    name: row.clientName,
    category: 'Viral Flight campaign',
    work: `${row.campaignTitle} · ${row.status}`,
    year: '',
    url: row.instagramUrl,
    confidence: 'confirmed',
    source: 'viral-flight',
  }))
  const profileBrands: BrandCollab[] = [
    ...input.pastCollaborations.map((name) => ({
      name,
      category: '',
      work: 'Listed on creator profile',
      year: '',
      url: '',
      confidence: 'confirmed' as const,
      source: 'profile' as const,
    })),
    ...input.caseStudies.map((study) => ({
      name: String(study.brand || ''),
      category: '',
      work: [study.title, study.result].filter(Boolean).join(' — '),
      year: '',
      url: String(study.url || ''),
      confidence: 'confirmed' as const,
      source: 'profile' as const,
    })),
  ].filter((item) => item.name)

  const user = [
    `Creator: ${input.name}`,
    `City: ${input.city || 'India'}`,
    input.handle ? `Instagram/handle: @${input.handle.replace(/^@/, '')}` : '',
    input.niches.length ? `Niches: ${input.niches.join(', ')}` : '',
    input.bio ? `Bio: ${input.bio}` : '',
    input.portfolioLink ? `Portfolio: ${input.portfolioLink}` : '',
    profileBrands.length
      ? `Already on Viral Flight profile:\n${profileBrands.map((item) => `- ${item.name}: ${item.work}`).join('\n')}`
      : '',
    vfBrands.length
      ? `Viral Flight campaigns:\n${vfBrands.map((item) => `- ${item.name}: ${item.work}`).join('\n')}`
      : '',
    'Find other brands they have worked with, and summarise their notable public work.',
  ]
    .filter(Boolean)
    .join('\n')

  const text = await completeClaudeResearch({ system: SYSTEM, user, maxTokens: 2800 })
  const researched = parseIntel(text, input.profileId)

  const merged = new Map<string, BrandCollab>()
  for (const brand of [...vfBrands, ...profileBrands, ...researched.brands]) {
    const key = brand.name.trim().toLowerCase()
    if (!key) continue
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, brand)
      continue
    }
    merged.set(key, {
      ...existing,
      work: existing.work || brand.work,
      url: existing.url || brand.url,
      category: existing.category || brand.category,
      year: existing.year || brand.year,
      confidence:
        existing.confidence === 'confirmed' || brand.confidence === 'confirmed'
          ? 'confirmed'
          : 'likely',
      source: existing.source === 'research' ? brand.source : existing.source,
    })
  }

  const brands = [...merged.values()]
  const now = new Date()
  const intel: InfluencerIntel = {
    profileId: input.profileId,
    summary: researched.summary,
    brandCount: brands.length,
    brands,
    work: researched.work,
    researchedAt: now.toISOString(),
  }

  await db().collection('vf_influencer_intel').updateOne(
    { profileId: input.profileId },
    {
      $set: { ...intel, researchedAt: now, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  )
  return intel
}
