import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { MATCHES, PROFILES, MATCH_PARTICIPANTS } from '@/lib/mock-data'

// GET /api/matches/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const matchId = parseInt(id)
  const auth = getUserFromRequest(req)

  if (useMockData) {
    const match = MATCHES.find((m) => m.id === matchId)
    if (!match) return NextResponse.json({ error: 'Match introuvable.' }, { status: 404 })

    const participantIds = MATCH_PARTICIPANTS.filter((mp) => mp.match_id === matchId).map((mp) => mp.user_id)
    const participants = PROFILES.filter((p) => participantIds.includes(p.user_id))
    const isJoined = auth ? participantIds.includes(auth.userId) : false

    return NextResponse.json({
      data: { ...match, participants, players_count: participants.length, isJoined }
    })
  }

  return NextResponse.json({ error: 'Match introuvable.' }, { status: 404 })
}
