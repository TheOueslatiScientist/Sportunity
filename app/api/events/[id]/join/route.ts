import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { EVENTS, PROFILES } from '@/lib/mock-data'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const eventId = parseInt(id)

  if (useMockData) {
    const event = EVENTS.find((e) => e.id === eventId)
    if (!event) return NextResponse.json({ error: 'Événement introuvable.' }, { status: 404 })
    const alreadyJoined = event.participants?.some((p: any) => p.user_id === auth.userId)
    if (alreadyJoined) return NextResponse.json({ error: 'Vous participez déjà à cet événement.' }, { status: 409 })
    if ((event.participants_count ?? 0) >= event.max_participants)
      return NextResponse.json({ error: "L'événement est complet." }, { status: 409 })
    const profile = PROFILES.find((p) => p.user_id === auth.userId)
    if (profile) {
      event.participants = [...(event.participants ?? []), profile]
      event.participants_count = (event.participants_count ?? 0) + 1
    }
    return NextResponse.json({ data: event })
  }

  // SportEvent has no participants table in schema yet — return success
  const { prisma } = await import('@/lib/prisma')
  const event = await prisma.sportEvent.findUnique({ where: { id: eventId } })
  if (!event) return NextResponse.json({ error: 'Événement introuvable.' }, { status: 404 })
  return NextResponse.json({ message: 'Vous avez rejoint l\'événement !' })
}
