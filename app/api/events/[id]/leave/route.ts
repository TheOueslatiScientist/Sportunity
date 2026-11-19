import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { EVENTS } from '@/lib/mock-data'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const eventId = parseInt(id)

  if (useMockData) {
    const event = EVENTS.find((e) => e.id === eventId)
    if (!event) return NextResponse.json({ error: 'Événement introuvable.' }, { status: 404 })
    const idx = event.participants?.findIndex((p: any) => p.user_id === auth.userId) ?? -1
    if (idx === -1) return NextResponse.json({ error: 'Vous ne participez pas à cet événement.' }, { status: 409 })
    event.participants = event.participants!.filter((p: any) => p.user_id !== auth.userId)
    event.participants_count = Math.max(0, (event.participants_count ?? 1) - 1)
    return NextResponse.json({ data: event })
  }

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { data: event } = await supabaseAdmin.from('sport_events').select('id').eq('id', eventId).single()
  if (!event) return NextResponse.json({ error: 'Événement introuvable.' }, { status: 404 })
  return NextResponse.json({ message: "Vous avez quitté l'événement." })
}
