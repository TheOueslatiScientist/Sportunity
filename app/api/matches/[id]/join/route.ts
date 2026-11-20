import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { MATCHES, MATCH_PARTICIPANTS } from '@/lib/mock-data'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const matchId = parseInt(id)

  if (useMockData) {
    const match = MATCHES.find((m) => m.id === matchId)
    if (!match) return NextResponse.json({ error: 'Match introuvable.' }, { status: 404 })
    const currentParticipants = MATCH_PARTICIPANTS.filter((mp) => mp.match_id === matchId)
    if (currentParticipants.some((mp) => mp.user_id === auth.userId))
      return NextResponse.json({ error: 'Vous participez déjà à ce match.' }, { status: 409 })
    if (currentParticipants.length >= match.max_players)
      return NextResponse.json({ error: 'Le match est complet.' }, { status: 400 })
    MATCH_PARTICIPANTS.push({ match_id: matchId, user_id: auth.userId })
    const newCount = MATCH_PARTICIPANTS.filter((mp) => mp.match_id === matchId).length
    if (newCount >= match.max_players) match.status = 'full'
    return NextResponse.json({ data: { players_count: newCount, status: match.status } })
  }

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { data: match } = await supabaseAdmin
    .from('matches')
    .select('id,title,maxPlayers,status,creatorId')
    .eq('id', matchId).single()
  if (!match) return NextResponse.json({ error: 'Match introuvable.' }, { status: 404 })

  const { data: existing } = await supabaseAdmin.from('match_participants').select('matchId')
    .eq('matchId', matchId).eq('profileId', auth.userId as number).maybeSingle()
  if (existing) return NextResponse.json({ error: 'Vous participez déjà à ce match.' }, { status: 409 })

  const { count } = await supabaseAdmin.from('match_participants')
    .select('*', { count: 'exact', head: true }).eq('matchId', matchId)
  if ((count ?? 0) >= match.maxPlayers)
    return NextResponse.json({ error: 'Le match est complet.' }, { status: 400 })

  await supabaseAdmin.from('match_participants').insert({ matchId, profileId: auth.userId as number })
  const newCount = (count ?? 0) + 1
  const newStatus = newCount >= match.maxPlayers ? 'FULL' : 'OPEN'
  if (newStatus !== match.status) await supabaseAdmin.from('matches').update({ status: newStatus }).eq('id', matchId)

  // Notifications (fire-and-forget)
  const { data: joiner } = await supabaseAdmin.from('profiles').select('name').eq('id', auth.userId as number).single()
  const joinerName = joiner?.name ?? 'Quelqu\'un'
  const { createNotification, createNotifications } = await import('@/lib/notify')

  if (newStatus === 'FULL') {
    // Notify all participants (except the one who just joined) that match is full
    const { data: allParticipants } = await supabaseAdmin.from('match_participants')
      .select('profileId').eq('matchId', matchId)
    const others = (allParticipants ?? [])
      .map((p: any) => p.profileId)
      .filter((pid: number) => pid !== (auth.userId as number))
    await createNotifications(others.map((userId: number) => ({
      userId, type: 'match_full' as const,
      title: `Match complet — ${match.title}`,
      body: 'Le match est maintenant complet. Prêt à jouer !',
      relatedId: matchId,
    })))
  } else {
    // Notify creator that someone joined
    if (match.creatorId !== (auth.userId as number)) {
      await createNotification({
        userId: match.creatorId as number, type: 'match_joined',
        title: `${joinerName} a rejoint ton match`,
        body: match.title, relatedId: matchId,
      })
    }
  }

  return NextResponse.json({ data: { players_count: newCount, status: newStatus.toLowerCase() } })
}
