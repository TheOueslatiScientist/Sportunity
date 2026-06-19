import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { MATCHES, MATCH_PARTICIPANTS } from '@/lib/mock-data'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const matchId = parseInt(id)

  // ── Mock mode ────────────────────────────────────────────────────────────────
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

  // ── Real mode: Prisma ────────────────────────────────────────────────────────
  const { prisma } = await import('@/lib/prisma')

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { participants: true },
  })
  if (!match) return NextResponse.json({ error: 'Match introuvable.' }, { status: 404 })
  if (match.participants.some((p) => p.profileId === auth.userId))
    return NextResponse.json({ error: 'Vous participez déjà à ce match.' }, { status: 409 })
  if (match.participants.length >= match.maxPlayers)
    return NextResponse.json({ error: 'Le match est complet.' }, { status: 400 })

  await prisma.matchParticipant.create({ data: { matchId, profileId: auth.userId } })
  const newCount = match.participants.length + 1
  const newStatus = newCount >= match.maxPlayers ? 'FULL' : 'OPEN'
  if (newStatus !== match.status)
    await prisma.match.update({ where: { id: matchId }, data: { status: newStatus as any } })

  return NextResponse.json({ data: { players_count: newCount, status: newStatus.toLowerCase() } })
}
