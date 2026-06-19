import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sport = searchParams.get('sport')
  const status = searchParams.get('status')
  const level = searchParams.get('level')
  const lat = parseFloat(searchParams.get('lat') || '')
  const lng = parseFloat(searchParams.get('lng') || '')
  const hasGeo = !isNaN(lat) && !isNaN(lng)

  // ── Mock mode ────────────────────────────────────────────────────────────────
  if (useMockData) {
    const { MATCHES, MATCH_PARTICIPANTS, PROFILES, SPORTS } = await import('@/lib/mock-data')
    let matches = [...MATCHES]
    if (sport && sport !== 'all') {
      const s = SPORTS.find((x) => x.name.toLowerCase() === sport.toLowerCase())
      if (s) matches = matches.filter((m) => m.sport_id === s.id)
    }
    if (status) matches = matches.filter((m) => m.status === status)
    if (level && level !== 'all') matches = matches.filter((m) => m.level === level)

    const enriched = matches.map((m) => {
      const participants = MATCH_PARTICIPANTS.filter((p) => p.match_id === m.id)
        .map((p) => PROFILES.find((pr) => pr.id === p.user_id))
        .filter(Boolean)
      const sportObj = SPORTS.find((s) => s.id === m.sport_id)
      const creator = PROFILES.find((p) => p.id === m.creator_id)
      const distance =
        hasGeo && m.lat && m.lng ? haversine(lat, lng, m.lat, m.lng) : undefined
      return { ...m, sport: sportObj, creator, participants, players_count: participants.length, distance }
    })

    if (hasGeo) enriched.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))
    else enriched.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return NextResponse.json({ data: enriched })
  }

  // ── Real mode: Prisma ────────────────────────────────────────────────────────
  const { prisma } = await import('@/lib/prisma')

  const where: any = {}
  if (sport && sport !== 'all') where.sport = { name: { equals: sport, mode: 'insensitive' } }
  if (status) where.status = status.toUpperCase()
  if (level && level !== 'all') where.level = level

  const matches = await prisma.match.findMany({
    where,
    include: { sport: true, participants: { include: { profile: true } } },
    orderBy: { date: 'asc' },
  })

  const enriched = matches.map((m) => {
    const distance = hasGeo && m.lat && m.lng ? haversine(lat, lng, m.lat, m.lng) : undefined
    return {
      id: m.id, title: m.title, sport_id: m.sportId, sport: m.sport,
      creator_id: m.creatorId, date: m.date.toISOString(), location: m.location,
      address: m.address, city: m.city, lat: m.lat, lng: m.lng,
      max_players: m.maxPlayers, players_count: m.participants.length,
      participants: m.participants.map((p) => serializeProfile(p.profile)),
      status: m.status.toLowerCase(), level: m.level, description: m.description,
      has_teams: m.hasTeams, team_a_name: m.teamAName, team_b_name: m.teamBName,
      created_at: m.createdAt.toISOString(), distance,
    }
  })

  if (hasGeo) enriched.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))
  return NextResponse.json({ data: enriched })
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const body = await req.json()

  if (useMockData) {
    const { MATCHES, MATCH_PARTICIPANTS, SPORTS } = await import('@/lib/mock-data')
    const sportObj = SPORTS.find((s) => s.name.toLowerCase() === (body.sport || '').toLowerCase())
    const newMatch: any = {
      id: MATCHES.length + 1, title: body.title, sport_id: sportObj?.id ?? 1,
      creator_id: user.userId, date: body.date, location: body.location,
      address: body.address, city: body.city ?? 'Lille', lat: body.lat, lng: body.lng,
      max_players: body.max_players ?? 10, players_count: 1, status: 'open',
      level: body.level ?? 'all', description: body.description,
      has_teams: body.has_teams ?? false, team_a_name: body.team_a_name,
      team_b_name: body.team_b_name, created_at: new Date().toISOString(),
    }
    MATCHES.push(newMatch)
    MATCH_PARTICIPANTS.push({ match_id: newMatch.id, user_id: user.userId })
    return NextResponse.json({ data: newMatch }, { status: 201 })
  }

  const { prisma } = await import('@/lib/prisma')
  const sport = body.sport
    ? await prisma.sport.findFirst({ where: { name: { equals: body.sport, mode: 'insensitive' } } })
    : null

  const match = await prisma.match.create({
    data: {
      title: body.title, sportId: sport?.id ?? 1, creatorId: user.userId,
      date: new Date(body.date), location: body.location, address: body.address,
      city: body.city ?? 'Lille', lat: body.lat, lng: body.lng,
      maxPlayers: body.max_players ?? 10, status: 'OPEN',
      level: body.level ?? 'all', description: body.description,
      hasTeams: body.has_teams ?? false, teamAName: body.team_a_name, teamBName: body.team_b_name,
      participants: { create: { profileId: user.userId } },
    },
    include: { sport: true },
  })
  return NextResponse.json({ data: match }, { status: 201 })
}

function serializeProfile(p: any) {
  return {
    id: p.id, user_id: p.id, name: p.name, avatar_url: p.avatarUrl,
    city: p.city, level: p.level?.toLowerCase(), is_coach: p.isCoach, role: p.role?.toLowerCase(),
  }
}
