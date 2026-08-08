import crypto from 'crypto'
import mongoose from 'mongoose'

const SETTINGS_KEY = 'company'

export type CrmSettingsPublic = {
  hasOpenAiKey: boolean
  openaiKeyHint: string
  openaiModel: string
  updatedAt: string
  updatedBy: string
  source: 'crm' | 'env' | 'none'
}

export type OpenAiRuntimeConfig = {
  apiKey: string
  model: string
  source: 'crm' | 'env' | 'none'
}

function db() {
  const connection = mongoose.connection.db
  if (!connection) throw new Error('Database connection is not ready')
  return connection
}

function secretMaterial() {
  return process.env.PAYLOAD_SECRET || process.env.JWT_SECRET || 'viralflight-dev-settings'
}

function encryptSecret(value: string) {
  const key = crypto.scryptSync(secretMaterial(), 'viralflight-crm-settings', 32)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

function decryptSecret(payload: string) {
  const [ivHex, tagHex, dataHex] = payload.split(':')
  if (!ivHex || !tagHex || !dataHex) return ''
  const key = crypto.scryptSync(secretMaterial(), 'viralflight-crm-settings', 32)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}

function maskKey(key: string) {
  const trimmed = key.trim()
  if (!trimmed) return ''
  if (trimmed.length <= 8) return '••••••••'
  return `${trimmed.slice(0, 3)}…${trimmed.slice(-4)}`
}

async function readSettingsDoc() {
  return db().collection('crm_settings').findOne({ key: SETTINGS_KEY })
}

export async function getOpenAiRuntimeConfig(): Promise<OpenAiRuntimeConfig> {
  const doc = await readSettingsDoc()
  const encrypted = String(doc?.openaiApiKeyEncrypted || '')
  if (encrypted) {
    try {
      const apiKey = decryptSecret(encrypted).trim()
      if (apiKey) {
        return {
          apiKey,
          model: String(doc?.openaiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini'),
          source: 'crm',
        }
      }
    } catch {
      // fall through to env
    }
  }

  const envKey = String(process.env.OPENAI_API_KEY || '').trim()
  if (envKey) {
    return {
      apiKey: envKey,
      model: String(process.env.OPENAI_MODEL || doc?.openaiModel || 'gpt-4o-mini'),
      source: 'env',
    }
  }

  return {
    apiKey: '',
    model: String(doc?.openaiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini'),
    source: 'none',
  }
}

export async function getCrmSettingsPublic(): Promise<CrmSettingsPublic> {
  const doc = await readSettingsDoc()
  const runtime = await getOpenAiRuntimeConfig()
  const hintFromDoc = String(doc?.openaiKeyHint || '')
  const hint =
    runtime.source === 'crm'
      ? hintFromDoc || maskKey(runtime.apiKey)
      : runtime.source === 'env'
        ? `${maskKey(runtime.apiKey)} (from server .env)`
        : ''

  return {
    hasOpenAiKey: Boolean(runtime.apiKey),
    openaiKeyHint: hint,
    openaiModel: runtime.model,
    updatedAt: doc?.updatedAt ? new Date(String(doc.updatedAt)).toISOString() : '',
    updatedBy: String(doc?.updatedBy || ''),
    source: runtime.source,
  }
}

export async function saveCrmAiSettings(input: {
  openaiApiKey?: string
  openaiModel?: string
  clearKey?: boolean
  updatedBy: string
}) {
  const now = new Date()
  const $set: Record<string, unknown> = {
    key: SETTINGS_KEY,
    updatedAt: now,
    updatedBy: input.updatedBy,
  }

  const model = String(input.openaiModel || '').trim() || 'gpt-4o-mini'
  $set.openaiModel = model.slice(0, 80)

  if (input.clearKey) {
    $set.openaiApiKeyEncrypted = ''
    $set.openaiKeyHint = ''
  } else if (input.openaiApiKey && input.openaiApiKey.trim()) {
    const key = input.openaiApiKey.trim()
    $set.openaiApiKeyEncrypted = encryptSecret(key)
    $set.openaiKeyHint = maskKey(key)
  }

  await db().collection('crm_settings').updateOne(
    { key: SETTINGS_KEY },
    {
      $set,
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  )
}
