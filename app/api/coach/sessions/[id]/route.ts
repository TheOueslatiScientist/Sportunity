import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { COACH_SESSIONS, COACHES } from '@/lib/mock-data'

// PATCH /api/coach/sessions/[id] — update status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const sessionId = parseInt(id)

  try {
    const { status, notes } = await req.json()

    if (useMockData) {
      const coach = COACHES.find((c) => c.user_id === auth.userId)
      const session = COACH_SESSIONS.find((s) => s.id === sessionId)
      if (!session) return NextResponse.json({ error: 'Session introuvable.' }, { status: 404 })
      if (coach && session.coach_id !== coach.id) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

      if (status) session.status = status as 'scheduled' | 'completed' | 'cancelled'
      if (notes !== undefined) session.notes = notes

      return NextResponse.json({ data: session })
    }

    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  } catch (err) {
    console.error('[PATCH /api/coach/sessions/[id]]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
