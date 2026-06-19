import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { MATCHES, MATCH_PARTICIPANTS } from '@/lib/mock-data'

// DELETE /api/matches/[id]/leave
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const matchId = parseInt(id)

  if (useMockData) {
    const match = MATCHES.find((m) => m.id === matchId)
    if (!match) return NextResponse.json({ error: 'Match introuvable.' }, { status: 404 })

    const idx = MATCH_PARTICIPANTS.findIndex((mp) => mp.match_id === matchId && mp.user_id === auth.userId)
    if (idx === -1) return NextResponse.json({ error: 'Vous ne participez pas à ce match.' }, { status: 400 })

    MATCH_PARTICIPANTS.splice(idx, 1)
    const newCount = MATCH_PARTICIPANTS.filter((mp) => mp.match_id === matchId).length
    if (match.status === 'full') match.status = 'open'

    return NextResponse.json({ data: { players_count: newCount, status: match.status } })
  }

  return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
}
