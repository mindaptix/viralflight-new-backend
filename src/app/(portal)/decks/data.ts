import crypto from 'crypto'
import { ObjectId } from 'mongodb'
import mongoose from 'mongoose'

import { asIso } from '../lib/format'
import type { DeckOutline, DeckSlide } from './ai'

function db() {
  const connection = mongoose.connection.db
  if (!connection) throw new Error('Database connection is not ready')
  return connection
}

function toObjectId(id: string) {
  try {
    return new ObjectId(id)
  } catch {
    return null
  }
}

export type ClientDeck = {
  id: string
  title: string
  subtitle: string
  clientName: string
  campaignId: string
  campaignTitle: string
  notes: string
  provider: string
  slides: DeckSlide[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

function mapDeck(doc: Record<string, unknown>): ClientDeck {
  const slidesRaw = Array.isArray(doc.slides) ? doc.slides : []
  return {
    id: String(doc._id),
    title: String(doc.title || 'Client deck'),
    subtitle: String(doc.subtitle || ''),
    clientName: String(doc.clientName || ''),
    campaignId: String(doc.campaignId || ''),
    campaignTitle: String(doc.campaignTitle || ''),
    notes: String(doc.notes || ''),
    provider: String(doc.provider || ''),
    slides: slidesRaw.map((slide) => {
      const item = slide && typeof slide === 'object' ? (slide as Record<string, unknown>) : {}
      const kindRaw = String(item.kind || 'content')
      return {
        kind:
          kindRaw === 'title' || kindRaw === 'stats' || kindRaw === 'closing'
            ? kindRaw
            : 'content',
        heading: String(item.heading || ''),
        bullets: Array.isArray(item.bullets) ? item.bullets.map(String) : [],
        note: String(item.note || ''),
      }
    }),
    createdBy: String(doc.createdBy || ''),
    createdAt: asIso(doc.createdAt),
    updatedAt: asIso(doc.updatedAt),
  }
}

export async function listClientDecks() {
  const docs = await db()
    .collection('vf_client_decks')
    .find({})
    .sort({ createdAt: -1 })
    .limit(80)
    .toArray()
  return docs.map((doc) => mapDeck(doc as Record<string, unknown>))
}

export async function getClientDeck(id: string) {
  const objectId = toObjectId(id)
  if (!objectId) return null
  const doc = await db().collection('vf_client_decks').findOne({ _id: objectId })
  return doc ? mapDeck(doc as Record<string, unknown>) : null
}

export async function saveClientDeck(input: {
  outline: DeckOutline
  campaignId?: string
  campaignTitle?: string
  notes?: string
  provider: string
  createdBy: string
}) {
  const now = new Date()
  const doc = {
    title: input.outline.title,
    subtitle: input.outline.subtitle,
    clientName: input.outline.clientName,
    campaignId: input.campaignId || '',
    campaignTitle: input.campaignTitle || '',
    notes: input.notes || '',
    provider: input.provider,
    slides: input.outline.slides,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
    revision: crypto.randomBytes(4).toString('hex'),
  }
  const result = await db().collection('vf_client_decks').insertOne(doc)
  return mapDeck({ ...doc, _id: result.insertedId })
}
