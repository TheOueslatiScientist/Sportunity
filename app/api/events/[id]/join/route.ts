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

    const alreadyJoined = event.participants?.some((p) => p.user_id === auth.userId)
    if (alreadyJoined) {
      return NextResponse.json({ error: 'Vous participez déjà à cet événement.' }, { status: 409 })
    }
    if ((event.participants_count ?? 0) >= event.max_participants) {
      return NextResponse.json({ error: 'L\'événement est complet.' }, { status: 409 })
    }

    const profile = PROFILES.find((p) => p.user_id === auth.userId)
    if (profile) {
      event.participants = [...(event.participants ?? []), profile]
      event.participants_count = (event.participants_count ?? 0) + 1
    }
    return NextResponse.json({ data: event })
  }

  const { getDb } = await import('@/lib/db')
  const db = getDb()

  const eventRes = await db.query('SELECT * FROM events WHERE id = $1', [eventId])
  if (eventRes.rows.length === 0) {
    return NextResponse.json({ error: 'Événement introuvable.' }, { status: 404 })
  }

  const countRes = await db.query('SELECT COUNT(*) FROM event_participants WHERE event_id = $1', [eventId])
  if (parseInt(countRes.rows[0].count) >= eventRes.rows[0].max_participants) {
    return NextResponse.json({ error: 'L\'événement est complet.' }, { status: 409 })
  }

  try {
    await db.query('INSERT INTO event_participants (event_id, user_id) VALUES ($1, $2)', [eventId, auth.userId])
    return NextResponse.json({ message: 'Vous avez rejoint l\'événement !' })
  } catch {
    return NextResponse.json({ error: 'Vous participez déjà à cet événement.' }, { status: 409 })
  }
}
