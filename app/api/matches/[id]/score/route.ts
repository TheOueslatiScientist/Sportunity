import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { MATCHES, MATCH_PARTICIPANTS } from '@/lib/mock-data'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const matchId = parseInt(id)
  const { score_a, score_b } = await req.json()

  if (score_a == null || score_b == null || isNaN(Number(score_a)) || isNaN(Number(score_b)))
    return NextResponse.json({ error: 'score_a et score_b sont requis.' }, { status: 400 })

  if (useMockData) {
    const match = MATCHES.find((m) => m.id === matchId)
    if (!match) return NextResponse.json({ error: 'Match introuvable.' }, { status: 404 })
    const participantIds = MATCH_PARTICIPANTS.filter((mp) => mp.match_id === matchId).map((mp) => mp.user_id)
    const isCreator = match.creator_id === auth.userId
    const isParticipant = participantIds.includes(auth.userId)
    if (!isCreator && !isParticipant)
      return NextResponse.json({ error: 'Réservé aux participants.' }, { status: 403 })
    const sa = parseInt(score_a), sb = parseInt(score_b)
    ;(match as any).score_a = sa
    ;(match as any).score_b = sb
    ;(match as any).status = 'completed'
    return NextResponse.json({ data: { score_a: sa, score_b: sb } })
  }

  const { supabaseAdmin } = await import('@/lib/supabase-admin')

  const { data: match } = await supabaseAdmin.from('matches').select('id,creatorId,status').eq('id', matchId).single()
  if (!match) return NextResponse.json({ error: 'Match introuvable.' }, { status: 404 })

  const { data: participant } = await supabaseAdmin.from('match_participants')
    .select('profileId').eq('matchId', matchId).eq('profileId', auth.userId as number).maybeSingle()

  const isCreator = match.creatorId === (auth.userId as number)
  if (!isCreator && !participant)
    return NextResponse.json({ error: 'Réservé aux participants du match.' }, { status: 403 })

  const { data: updated, error } = await supabaseAdmin
    .from('matches')
    .update({ scoreA: parseInt(score_a), scoreB: parseInt(score_b), status: 'COMPLETED' })
    .eq('id', matchId)
    .select('scoreA,scoreB,status')
    .single()

  if (error) {
    console.error('[POST /api/matches/[id]/score]', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }

  return NextResponse.json({ data: { score_a: updated.scoreA, score_b: updated.scoreB, status: 'completed' } })
}
