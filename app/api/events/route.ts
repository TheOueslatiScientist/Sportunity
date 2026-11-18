import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { EVENTS, PROFILES, SPORTS, INFRASTRUCTURES, getNextId } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sport = searchParams.get('sport')
  const level = searchParams.get('level')

  // ── Mock mode ────────────────────────────────────────────────────────────────
  if (useMockData) {
    let data = [...EVENTS]
    if (sport && sport !== 'all') data = data.filter((e) => e.sport?.name.toLowerCase() === sport.toLowerCase())
    if (level && level !== 'all') data = data.filter((e) => e.level === level)
    data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return NextResponse.json({ data })
  }

  // ── Real mode: Supabase ───────────────────────────────────────────────────
  try {
    const { supabaseAdmin } = await import('@/lib/supabase-admin')

    let query = supabaseAdmin
      .from('sport_events')
      .select('id, title, sportId, infrastructureId, creatorId, date, maxParticipants, description, level, createdAt')
      .gt('date', new Date().toISOString())
      .order('date', { ascending: true })

    if (sport && sport !== 'all') query = query.eq('sportId', sport)
    if (level && level !== 'all') query = query.eq('level', level)

    const { data: rows, error } = await query
    if (error) throw error

    const data = (rows ?? []).map((e: any) => ({
      id: e.id, title: e.title, sport_id: e.sportId, sport: null,
      infrastructure_id: e.infrastructureId, infrastructure: null,
      creator_id: e.creatorId, date: e.date,
      max_participants: e.maxParticipants, description: e.description,
      level: e.level, participants_count: 0, participants: [],
      created_at: e.createdAt,
    }))

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[GET /api/events]', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  try {
    const { title, sport_id, infrastructure_id, date, max_participants, description, level } = await req.json()
    if (!title || !sport_id || !date)
      return NextResponse.json({ error: 'Titre, sport et date sont requis.' }, { status: 400 })

    // ── Mock mode ────────────────────────────────────────────────────────────────
    if (useMockData) {
      const sport = SPORTS.find((s) => s.id === sport_id)
      const infrastructure = INFRASTRUCTURES.find((i) => i.id === infrastructure_id)
      const creator = PROFILES.find((p) => p.user_id === auth.userId)
      const newEvent: any = {
        id: getNextId(EVENTS), title, sport_id, sport, infrastructure_id, infrastructure,
        creator_id: auth.userId, creator, date, max_participants: max_participants ?? 10,
        description, level: level ?? 'all', participants: creator ? [creator] : [], participants_count: 1,
      }
      EVENTS.push(newEvent)
      return NextResponse.json({ data: newEvent }, { status: 201 })
    }

    // ── Real mode: Supabase ───────────────────────────────────────────────────
    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    const { data: event, error: eventError } = await supabaseAdmin
      .from('sport_events')
      .insert({
        title, sportId: sport_id, infrastructureId: infrastructure_id ?? null,
        creatorId: auth.userId, date: new Date(date).toISOString(),
        maxParticipants: max_participants ?? 10, description, level: level ?? 'all',
      })
      .select()
      .single()
    if (eventError || !event) throw new Error(eventError?.message ?? 'Erreur création event')
    return NextResponse.json({ data: { ...event, participants_count: 1, participants: [] } }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/events]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
