import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { COACH_SESSIONS, COACHES, PROFILES, getNextId } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const role   = searchParams.get('role') ?? 'coach'
  const status = searchParams.get('status')

  // ── Mock mode ────────────────────────────────────────────────────────────────
  if (useMockData) {
    const coach = COACHES.find((c) => c.user_id === auth.userId)
    let sessions = [...COACH_SESSIONS]

    if (role === 'coach' && coach) sessions = sessions.filter((s) => s.coach_id === coach.id)
    else sessions = sessions.filter((s) => s.client_id === auth.userId)
    if (status) sessions = sessions.filter((s) => s.status === status)

    sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    sessions = sessions.map((s) => ({
      ...s,
      coach: s.coach ?? COACHES.find((c) => c.id === s.coach_id),
      client: s.client ?? PROFILES.find((p) => p.user_id === s.client_id),
    }))

    const upcoming = sessions.filter((s) => s.status === 'scheduled' && new Date(s.date) > new Date()).length
    const completed = sessions.filter((s) => s.status === 'completed').length
    const totalRevenue = sessions.filter((s) => s.status === 'completed').reduce((sum, s) => sum + (s.price ?? 0), 0)
    const uniqueClients = new Set(sessions.map((s) => s.client_id)).size

    return NextResponse.json({ data: sessions, stats: { upcoming, completed, totalRevenue, uniqueClients } })
  }

  // ── Real mode: Prisma ────────────────────────────────────────────────────────
  const { prisma } = await import('@/lib/prisma')

  const coach = await prisma.coach.findUnique({ where: { profileId: auth.userId } })

  const where: any = {}
  if (role === 'coach' && coach) where.coachId = coach.id
  else where.clientId = auth.userId
  if (status) where.status = status.toUpperCase()

  const sessions = await prisma.coachSession.findMany({
    where,
    include: {
      coach: { include: { profile: true, sport: true } },
      client: true,
    },
    orderBy: { date: 'asc' },
  })

  const serialized = sessions.map((s) => ({
    id: s.id,
    coach_id: s.coachId,
    coach: s.coach ? serializeCoach(s.coach) : null,
    client_id: s.clientId,
    client: serializeProfile(s.client),
    date: s.date.toISOString(),
    duration_minutes: s.durationMinutes,
    location: s.location,
    city: s.city,
    status: s.status.toLowerCase(),
    notes: s.notes,
    price: s.price,
    created_at: s.createdAt.toISOString(),
  }))

  const now = new Date()
  const upcoming = serialized.filter((s) => s.status === 'scheduled' && new Date(s.date) > now).length
  const completed = serialized.filter((s) => s.status === 'completed').length
  const totalRevenue = serialized.filter((s) => s.status === 'completed').reduce((sum, s) => sum + (s.price ?? 0), 0)
  const uniqueClients = new Set(serialized.map((s) => s.client_id)).size

  return NextResponse.json({ data: serialized, stats: { upcoming, completed, totalRevenue, uniqueClients } })
}

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  try {
    const { client_id, date, duration_minutes, location, city, notes, price } = await req.json()
    if (!client_id || !date || !duration_minutes || !location)
      return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 })

    if (useMockData) {
      const coach = COACHES.find((c) => c.user_id === auth.userId)
      if (!coach) return NextResponse.json({ error: "Vous n'êtes pas coach." }, { status: 403 })
      const client = PROFILES.find((p) => p.user_id === client_id)
      const newSession: any = {
        id: getNextId(COACH_SESSIONS), coach_id: coach.id, coach, client_id, client,
        date, duration_minutes: parseInt(duration_minutes), location, city,
        status: 'scheduled', notes, price: price ? parseFloat(price) : undefined,
        created_at: new Date().toISOString(),
      }
      COACH_SESSIONS.push(newSession)
      return NextResponse.json({ data: newSession }, { status: 201 })
    }

    const { prisma } = await import('@/lib/prisma')
    const coach = await prisma.coach.findUnique({ where: { profileId: auth.userId } })
    if (!coach) return NextResponse.json({ error: "Vous n'êtes pas coach." }, { status: 403 })

    const session = await prisma.coachSession.create({
      data: {
        coachId: coach.id, clientId: client_id,
        date: new Date(date), durationMinutes: parseInt(duration_minutes),
        location, city, status: 'SCHEDULED', notes, price: price ? parseFloat(price) : null,
      },
      include: { coach: { include: { profile: true } }, client: true },
    })

    return NextResponse.json({ data: session }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/coach/sessions]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

function serializeProfile(p: any) {
  return { id: p.id, user_id: p.id, name: p.name, avatar_url: p.avatarUrl, city: p.city }
}

function serializeCoach(c: any) {
  return {
    id: c.id, profile_id: c.profileId, profile: serializeProfile(c.profile),
    sport: c.sport, hourly_rate: c.hourlyRate, rating: c.rating,
    is_certified: c.isCertified, city: c.city,
  }
}
