import { existsSync } from 'fs'
import path from 'path'

import PptxGenJS from 'pptxgenjs'

import type { ClientDeck } from './data'

const ORANGE = 'F7921D'
const GREEN = '21B011'
const BLACK = '000000'
const WHITE = 'FFFFFF'
const MUTED = 'A3A3A3'

function logoPath() {
  const file = path.join(process.cwd(), 'public', 'logo-viral-flight.png')
  return existsSync(file) ? file : ''
}

export async function buildClientPptx(deck: ClientDeck) {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'Viral Flight'
  pptx.title = deck.title
  pptx.subject = `Client presentation for ${deck.clientName}`
  const logo = logoPath()

  deck.slides.forEach((slideData, index) => {
    const slide = pptx.addSlide()
    slide.background = { color: BLACK }

    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.12,
      fill: { color: ORANGE },
    })
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0.12,
      w: 13.33,
      h: 0.08,
      fill: { color: GREEN },
    })

    if (logo) {
      slide.addImage({ path: logo, x: 0.45, y: 0.4, w: 1.5, h: 0.58 })
    } else {
      slide.addText('VIRAL FLIGHT', {
        x: 0.5,
        y: 0.4,
        w: 4,
        h: 0.35,
        fontSize: 11,
        bold: true,
        color: ORANGE,
        fontFace: 'Arial',
      })
    }

    slide.addText(deck.clientName || 'Client', {
      x: 8.5,
      y: 0.45,
      w: 4.4,
      h: 0.35,
      fontSize: 12,
      color: MUTED,
      align: 'right',
      fontFace: 'Arial',
    })

    if (slideData.kind === 'title') {
      slide.addText(slideData.heading, {
        x: 0.7,
        y: 2.3,
        w: 12,
        h: 1.4,
        fontSize: 36,
        bold: true,
        color: WHITE,
        fontFace: 'Arial',
      })
      slide.addText(deck.subtitle || slideData.bullets[0] || 'Prepared by Viral Flight', {
        x: 0.7,
        y: 3.8,
        w: 11,
        h: 0.6,
        fontSize: 18,
        color: ORANGE,
        fontFace: 'Arial',
      })
      slide.addText('Confidential · Viral Flight CRM', {
        x: 0.7,
        y: 6.7,
        w: 10,
        h: 0.3,
        fontSize: 11,
        color: MUTED,
        fontFace: 'Arial',
      })
    } else {
      slide.addText(slideData.heading, {
        x: 0.7,
        y: 1.15,
        w: 12,
        h: 0.7,
        fontSize: 26,
        bold: true,
        color: WHITE,
        fontFace: 'Arial',
      })
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.7,
        y: 1.9,
        w: 1.4,
        h: 0.08,
        fill: { color: slideData.kind === 'stats' ? GREEN : ORANGE },
      })
      slide.addText(
        slideData.bullets.map((bullet) => ({
          text: bullet,
          options: { bullet: true, breakLine: true },
        })),
        {
          x: 0.7,
          y: 2.2,
          w: 12,
          h: 4.2,
          fontSize: 18,
          color: WHITE,
          fontFace: 'Arial',
          paraSpaceAfter: 10,
        },
      )
    }

    slide.addText(`${index + 1} / ${deck.slides.length}`, {
      x: 11.4,
      y: 6.95,
      w: 1.4,
      h: 0.25,
      fontSize: 10,
      color: MUTED,
      align: 'right',
      fontFace: 'Arial',
    })

    if (slideData.note) {
      slide.addNotes(slideData.note)
    }
  })

  const output = await pptx.write({ outputType: 'uint8array' })
  return Buffer.from(output as Uint8Array)
}

export function deckFileName(deck: ClientDeck) {
  const base = `${deck.clientName || 'client'}-${deck.title || 'deck'}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return `${base || 'viral-flight-deck'}.pptx`
}
