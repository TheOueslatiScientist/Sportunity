import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id: idStr } = await params
  const profileId = parseInt(idStr)

  const { searchParams } = new URL(req.url)
  const sportId = searchParams.get('sport')
  const period = searchParams.get('period') // '1m' | '3m' | '6m' | 'all'

  if (useMockData) return NextResponse.json({ data: [] })

  const { supabaseAdmin } = await import('@/lib/supabase-admin')

  // Date filter
  let fromDate: string | null = null
  const now = new Date()
  if (period === '1m') { const d = new Date(now); d.setMonth(d.getMonth() - 1); fromDate = d.toISOString() }
  else if (period === '3m') { const d = new Date(now); d.setMonth(d.getMonth() - 3); fromDate = d.toISOString() }
  else if (period === '6m') { const d = new Date(now); d.setMonth(d.getMonth() - 6); fromDate = d.toISOString() }

  // Events where user was creator
  let creatorQuery = supabaseAdmin
    .from('sport_events')
    .select('id, title, date, sportId, score, teamA, teamB, maxParticipants, level')
    .eq('creatorId', profileId)
    .lt('date', now.toISOString())
    .order('date', { ascending: false })
    .limit(50)
  if (fromDate) creatorQuery = creatorQuery.gte('date', fromDate)
  if (sportId) creatorQuery = creatorQuery.eq('sportId', sportId)

  // Events where user was participant (ACCEPTED)
  let participantQuery = supabaseAdmin
    .from('event_participants')
    .select('eventId, sport_events(id, title, date, sportId, score, teamA, teamB, maxParticipants, level, creatorId)')
    .eq('profileId', profileId)
    .eq('status', 'ACCEPTED')
    .limit(50)

  const [{ data: createdEvents }, { data: participantRows }] = await Promise.all([
    creatorQuery,
    participantQuery,
  ])

  // Merge & deduplicate, filter by date for participant events
  const seen = new Set<number>()
  const all: any[] = []

  for (const e of createdEvents ?? []) {
    if (seen.has(e.id)) continue
    seen.add(e.id)
    all.push({ ...e, role: 'creator' })
  }

  for (const row of participantRows ?? []) {
    const e = (row as any).sport_events
    if (!e || seen.has(e.id)) continue
    const eventDate = new Date(e.date)
    if (eventDate >= now) continue
    if (fromDate && eventDate < new Date(fromDate)) continue
    if (sportId && String(e.sportId) !== sportId) continue
    seen.add(e.id)
    all.push({ ...e, role: 'participant' })
  }

  all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const data = all.map((e: any) => ({
    id: e.id, title: e.title, date: e.date,
    sport_id: e.sportId, score: e.score ?? null,
    team_a: e.teamA ?? null, team_b: e.teamB ?? null,
    max_participants: e.maxParticipants, level: e.level,
    role: e.role,
  }))

  return NextResponse.json({ data })
}
