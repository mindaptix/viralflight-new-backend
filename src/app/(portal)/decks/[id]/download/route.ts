import { getPortalUser } from '../../../lib/auth'
import { getClientDeck } from '../../data'
import { buildClientPptx, deckFileName } from '../../pptx'

export const dynamic = 'force-dynamic'

type RouteProps = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteProps) {
  const user = await getPortalUser()
  if (!user || user.role !== 'super_admin') {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id } = await params
  const deck = await getClientDeck(id)
  if (!deck) return new Response('Not found', { status: 404 })

  const buffer = await buildClientPptx(deck)
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${deckFileName(deck)}"`,
    },
  })
}
