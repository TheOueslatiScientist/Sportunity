import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { EVENTS } from '@/lib/mock-data'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const eventId = parseInt(id)
  const { score, team_a, team_b } = await req.json()

  if (typeof score !== 'string') return NextResponse.json({ error: 'Score invalide.' }, { status: 400 })

  if (useMockData) {
    const event = EVENTS.find((e) => e.id === eventId)
    if (!event) return NextResponse.json({ error: 'Événement introuvable.' }, { status: 404 })
    if (event.creator_id !== auth.userId) return NextResponse.json({ error: 'Seul le créateur peut saisir le score.' }, { status: 403 })
    ;(event as any).score = score
    ;(event as any).team_a = team_a ?? null
    ;(event as any).team_b = team_b ?? null
    return NextResponse.json({ data: { score, team_a, team_b } })
  }

  const { supabaseAdmin } = await import('@/lib/supabase-admin')

  const { data: event } = await supabaseAdmin
    .from('sport_events')
    .select('creatorId')
    .eq('id', eventId)
    .single()

  if (!event) return NextResponse.json({ error: 'Événement introuvable.' }, { status: 404 })
  if (event.creatorId !== auth.userId) return NextResponse.json({ error: 'Seul le créateur peut saisir le score.' }, { status: 403 })

  const updates: Record<string, string | null> = { score: score.trim() || null }
  if (team_a !== undefined) updates.teamA = (team_a as string)?.trim() || null
  if (team_b !== undefined) updates.teamB = (team_b as string)?.trim() || null

  const { error } = await supabaseAdmin
    .from('sport_events')
    .update(updates)
    .eq('id', eventId)

  if (error) {
    console.error('[PATCH /api/events/[id]/score]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: { score: score.trim() || null, team_a: updates.teamA, team_b: updates.teamB } })
}
