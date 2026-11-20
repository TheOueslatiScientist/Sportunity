import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { MATCHES, PROFILES, MATCH_PARTICIPANTS, SPORTS } from '@/lib/mock-data'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const matchId = parseInt(id)
  const auth = await getUserFromRequest(req)

  if (useMockData) {
    const match = MATCHES.find((m) => m.id === matchId)
    if (!match) return NextResponse.json({ error: 'Match introuvable.' }, { status: 404 })
    const participantIds = MATCH_PARTICIPANTS.filter((mp) => mp.match_id === matchId).map((mp) => mp.user_id)
    const participants = PROFILES.filter((p) => participantIds.includes(p.user_id))
    const isJoined = auth ? participantIds.includes(auth.userId) : false
    return NextResponse.json({ data: { ...match, participants, players_count: participants.length, isJoined } })
  }

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { data: match } = await supabaseAdmin
    .from('matches')
    .select('id,title,sportId,creatorId,date,location,address,city,lat,lng,maxPlayers,status,level,description,hasTeams,teamAName,teamBName,scoreA,scoreB,createdAt')
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Match introuvable.' }, { status: 404 })

  const { data: participantRows } = await supabaseAdmin
    .from('match_participants')
    .select('profileId')
    .eq('matchId', matchId)

  const participantIds = (participantRows ?? []).map((p: any) => p.profileId)
  const { data: profiles } = participantIds.length
    ? await supabaseAdmin.from('profiles').select('id,name,avatarUrl,city,level,isCoach').in('id', participantIds)
    : { data: [] }

  const { data: creator } = await supabaseAdmin.from('profiles').select('id,name,avatarUrl,city').eq('id', match.creatorId).single()

  const sport = SPORTS.find((s) => s.id === match.sportId) ?? null
  const isJoined = auth ? participantIds.includes(auth.userId as number) : false

  const serialize = (p: any) => ({ id: p.id, user_id: p.id, name: p.name, avatar_url: p.avatarUrl, city: p.city, level: p.level?.toLowerCase(), is_coach: p.isCoach })

  return NextResponse.json({
    data: {
      id: match.id, title: match.title, sport_id: match.sportId, sport,
      creator_id: match.creatorId, creator: creator ? serialize(creator) : null,
      date: match.date, location: match.location, address: match.address, city: match.city,
      lat: match.lat, lng: match.lng, max_players: match.maxPlayers,
      players_count: participantIds.length,
      participants: (profiles ?? []).map(serialize),
      status: match.status?.toLowerCase(), level: match.level, description: match.description,
      has_teams: match.hasTeams, team_a_name: match.teamAName, team_b_name: match.teamBName,
      score_a: match.scoreA ?? null, score_b: match.scoreB ?? null,
      created_at: match.createdAt, isJoined,
    }
  })
}
