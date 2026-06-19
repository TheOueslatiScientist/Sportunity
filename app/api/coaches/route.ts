import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { COACHES, PROFILES, SPORTS, getNextId } from '@/lib/mock-data'
import { haversineDistance } from '@/lib/utils'

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sport     = searchParams.get('sport')
  const maxPrice  = searchParams.get('maxPrice')
  const available = searchParams.get('available')
  const certified = searchParams.get('certified')
  const userLat   = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null
  const userLng   = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null
  const maxDist   = searchParams.get('maxDist') ? parseFloat(searchParams.get('maxDist')!) : null

  // ── Mock mode ────────────────────────────────────────────────────────────────
  if (useMockData) {
    let data = [...COACHES]
    if (sport && sport !== 'all') data = data.filter((c) => c.sport?.name.toLowerCase() === sport.toLowerCase())
    if (maxPrice) data = data.filter((c) => c.hourly_rate <= parseInt(maxPrice))
    if (available === 'true') data = data.filter((c) => c.is_available_now)
    if (certified === 'true') data = data.filter((c) => c.is_certified)
    if (userLat && userLng) {
      data = data.map((c) => ({ ...c, distance: c.lat && c.lng ? haversineDistance(userLat, userLng, c.lat, c.lng) : undefined }))
      if (maxDist) data = data.filter((c) => !c.distance || c.distance <= maxDist)
      data.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))
    } else {
      data.sort((a, b) => b.rating - a.rating)
    }
    return NextResponse.json({ data })
  }

  // ── Real mode: Prisma ────────────────────────────────────────────────────────
  const { prisma } = await import('@/lib/prisma')

  const where: any = {}
  if (sport && sport !== 'all') where.sport = { name: { equals: sport, mode: 'insensitive' } }
  if (maxPrice) where.hourlyRate = { lte: parseFloat(maxPrice) }
  if (available === 'true') where.isAvailableNow = true
  if (certified === 'true') where.isCertified = true

  const coaches = await prisma.coach.findMany({
    where,
    include: { profile: true, sport: true },
    orderBy: { rating: 'desc' },
  })

  let data = coaches.map((c) => {
    const distance = userLat && userLng && c.lat && c.lng ? haversine(userLat, userLng, c.lat, c.lng) : undefined
    return {
      id: c.id, user_id: c.profileId, profile: serializeProfile(c.profile),
      sport_id: c.sportId, sport: c.sport, hourly_rate: c.hourlyRate,
      description: c.description, experience_years: c.experienceYears,
      rating: c.rating, reviews_count: c.reviewsCount,
      certifications: c.certifications, specialties: c.specialties,
      city: c.city, lat: c.lat, lng: c.lng, languages: c.languages,
      availability_text: c.availabilityText, is_available_now: c.isAvailableNow,
      is_certified: c.isCertified, is_popular: c.isPopular,
      clients_count: c.clientsCount, sessions_count: c.sessionsCount, distance,
    }
  })

  if (userLat && userLng) {
    if (maxDist) data = data.filter((c) => !c.distance || c.distance <= maxDist)
    data.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))
  }

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  try {
    const { sport_id, hourly_rate, description, experience_years, certifications, specialties, city, lat, lng, availability_text, is_available_now } = await req.json()
    if (!sport_id || !hourly_rate || !experience_years)
      return NextResponse.json({ error: 'Sport, tarif et expérience sont requis.' }, { status: 400 })

    if (useMockData) {
      const existing = COACHES.find((c) => c.user_id === auth.userId)
      if (existing) return NextResponse.json({ error: 'Vous êtes déjà coach.' }, { status: 409 })
      const sport = SPORTS.find((s) => s.id === sport_id)
      const profile = PROFILES.find((p) => p.user_id === auth.userId)
      if (profile) profile.is_coach = true
      const newCoach: any = {
        id: getNextId(COACHES), user_id: auth.userId, profile, sport_id, sport,
        hourly_rate: parseFloat(hourly_rate), description, experience_years: parseInt(experience_years),
        rating: 0, reviews_count: 0, certifications: certifications ?? [], specialties: specialties ?? [],
        city: city ?? profile?.city ?? '', lat, lng, languages: ['Français'],
        is_available_now: is_available_now ?? true, is_certified: (certifications ?? []).length > 0,
        is_popular: false, clients_count: 0, sessions_count: 0, availability_text: availability_text ?? '',
      }
      COACHES.push(newCoach)
      return NextResponse.json({ data: newCoach }, { status: 201 })
    }

    const { prisma } = await import('@/lib/prisma')
    const existing = await prisma.coach.findUnique({ where: { profileId: auth.userId } })
    if (existing) return NextResponse.json({ error: 'Vous êtes déjà coach.' }, { status: 409 })

    const [coach] = await prisma.$transaction([
      prisma.coach.create({
        data: {
          profileId: auth.userId, sportId: sport_id, hourlyRate: parseFloat(hourly_rate),
          description, experienceYears: parseInt(experience_years),
          certifications: certifications ?? [], specialties: specialties ?? [],
          city, lat, lng, isAvailableNow: is_available_now ?? true,
          isCertified: (certifications ?? []).length > 0, availabilityText: availability_text,
        },
        include: { profile: true, sport: true },
      }),
      prisma.profile.update({ where: { id: auth.userId }, data: { isCoach: true, role: 'COACH' } }),
    ])
    return NextResponse.json({ data: coach }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/coaches]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

function serializeProfile(p: any) {
  return { id: p.id, user_id: p.id, name: p.name, avatar_url: p.avatarUrl, city: p.city, bio: p.bio, level: p.level?.toLowerCase() }
}
