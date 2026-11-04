import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { COMPETITIONS, COMPETITION_PARTICIPANTS } from '@/lib/mock-data'

// POST /api/competitions/[id]/join
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const compId = parseInt(id)

  if (useMockData) {
    const comp = COMPETITIONS.find((c) => c.id === compId)
    if (!comp) return NextResponse.json({ error: 'Compétition introuvable.' }, { status: 404 })

    const current = COMPETITION_PARTICIPANTS.filter((cp) => cp.competition_id === compId)
    if (current.some((cp) => cp.user_id === auth.userId)) {
      return NextResponse.json({ error: 'Vous êtes déjà inscrit.' }, { status: 409 })
    }
    if (current.length >= comp.max_participants) {
      return NextResponse.json({ error: 'La compétition est complète.' }, { status: 400 })
    }

    COMPETITION_PARTICIPANTS.push({ competition_id: compId, user_id: auth.userId })
    const newCount = COMPETITION_PARTICIPANTS.filter((cp) => cp.competition_id === compId).length
    if (newCount >= comp.max_participants) comp.status = 'full'

    return NextResponse.json({ data: { participants_count: newCount, status: comp.status } })
  }

  return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
}

// DELETE /api/competitions/[id]/join — withdraw
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const compId = parseInt(id)

  if (useMockData) {
    const comp = COMPETITIONS.find((c) => c.id === compId)
    if (!comp) return NextResponse.json({ error: 'Compétition introuvable.' }, { status: 404 })

    const idx = COMPETITION_PARTICIPANTS.findIndex((cp) => cp.competition_id === compId && cp.user_id === auth.userId)
    if (idx === -1) return NextResponse.json({ error: 'Vous n\'êtes pas inscrit.' }, { status: 400 })

    COMPETITION_PARTICIPANTS.splice(idx, 1)
    const newCount = COMPETITION_PARTICIPANTS.filter((cp) => cp.competition_id === compId).length
    if (comp.status === 'full') comp.status = 'open'

    return NextResponse.json({ data: { participants_count: newCount, status: comp.status } })
  }

  return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
}
