import { ObjectId } from 'mongodb'
import crypto from 'crypto'
import mongoose from 'mongoose'

import { saveAssignmentStats, type IgStats, type VfAssignment } from './data'

function db() {
  const connection = mongoose.connection.db
  if (!connection) throw new Error('Database connection is not ready')
  return connection
}

function encryptionKey() {
  const secret =
    process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    process.env.PAYLOAD_SECRET ||
    ''
  if (/^[a-f0-9]{64}$/i.test(secret)) return Buffer.from(secret, 'hex')
  return crypto.createHash('sha256').update(secret).digest()
}

function decryptIgToken(encrypted: Record<string, unknown> | null) {
  if (!encrypted?.iv || !encrypted?.tag || !encrypted?.value) return ''
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(String(encrypted.iv), 'base64'),
  )
  decipher.setAuthTag(Buffer.from(String(encrypted.tag), 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(String(encrypted.value), 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

function graphBase() {
  return `https://graph.facebook.com/${process.env.INSTAGRAM_GRAPH_API_VERSION || 'v23.0'}`
}

function appToken() {
  const id = process.env.INSTAGRAM_APP_ID || ''
  const secret = process.env.INSTAGRAM_APP_SECRET || ''
  return id && secret ? `${id}|${secret}` : ''
}

export async function refreshCreatorStats(assignment: VfAssignment): Promise<IgStats> {
  const permalink = assignment.instagramUrl.trim()
  if (!permalink) {
    throw new Error('No Instagram URL yet')
  }

  let stats: IgStats = {
    views: 0,
    likes: 0,
    comments: 0,
    reach: 0,
    engagementRate: 0,
    fetchedAt: new Date().toISOString(),
    source: 'pending',
    note: '',
  }

  try {
      const profile = assignment.influencerId
      ? await db().collection('influencer_profiles').findOne({
          _id: new ObjectId(assignment.influencerId),
        })
      : null
    const ig = profile?.instagram && typeof profile.instagram === 'object'
      ? (profile.instagram as Record<string, unknown>)
      : null
    const token = ig?.token && typeof ig.token === 'object'
      ? decryptIgToken(ig.token as Record<string, unknown>)
      : ''
    const igUserId = String(ig?.instagramUserId || '')

    if (token && igUserId) {
      const mediaUrl = new URL(`${graphBase()}/${igUserId}/media`)
      mediaUrl.searchParams.set(
        'fields',
        'id,permalink,like_count,comments_count,media_type,timestamp',
      )
      mediaUrl.searchParams.set('limit', '30')
      mediaUrl.searchParams.set('access_token', token)
      const mediaRes = await fetch(mediaUrl)
      const mediaJson = (await mediaRes.json()) as {
        data?: Array<Record<string, unknown>>
        error?: { message?: string }
      }
      const match = (mediaJson.data || []).find((item) =>
        String(item.permalink || '').replace(/\/$/, '') === permalink.replace(/\/$/, ''),
      )
      if (match) {
        stats.likes = Number(match.like_count || 0)
        stats.comments = Number(match.comments_count || 0)
        stats.source = 'instagram_graph'
        try {
          const insightsUrl = new URL(`${graphBase()}/${match.id}/insights`)
          insightsUrl.searchParams.set('metric', 'plays,reach,saved')
          insightsUrl.searchParams.set('access_token', token)
          const insightsRes = await fetch(insightsUrl)
          const insightsJson = (await insightsRes.json()) as {
            data?: Array<{ name?: string; values?: Array<{ value?: number }> }>
          }
          for (const metric of insightsJson.data || []) {
            const value = Number(metric.values?.[0]?.value || 0)
            if (metric.name === 'plays') stats.views = value
            if (metric.name === 'reach') stats.reach = value
          }
        } catch {
          // insights optional
        }
        if (stats.views) {
          stats.engagementRate = Number(
            (((stats.likes + stats.comments) / stats.views) * 100).toFixed(2),
          )
        }
        stats.note = 'Live from connected Instagram Graph account'
        await saveAssignmentStats(assignment.id, stats)
        return stats
      }
    }
  } catch (error) {
    stats.note = error instanceof Error ? error.message : 'Graph lookup failed'
  }

  const token = appToken()
  if (token) {
    try {
      const oembed = new URL(`${graphBase()}/instagram_oembed`)
      oembed.searchParams.set('url', permalink)
      oembed.searchParams.set('access_token', token)
      const response = await fetch(oembed)
      const json = (await response.json()) as { author_name?: string; error?: { message?: string } }
      if (response.ok) {
        stats.source = 'instagram_oembed'
        stats.note = `Permalink valid${json.author_name ? ` · @${json.author_name}` : ''}. Views/likes need a connected IG business token.`
        await saveAssignmentStats(assignment.id, stats)
        return stats
      }
      stats.note = json.error?.message || 'oEmbed failed'
    } catch (error) {
      stats.note = error instanceof Error ? error.message : 'oEmbed failed'
    }
  } else {
    stats.note =
      'Saved permalink. Add INSTAGRAM_APP_ID/SECRET or connect the creator Instagram to pull live views/likes.'
    stats.source = 'permalink_only'
  }

  await saveAssignmentStats(assignment.id, stats)
  return stats
}
