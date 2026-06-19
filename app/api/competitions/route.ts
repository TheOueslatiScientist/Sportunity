import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { COMPETITIONS, COMPETITION_PARTICIPANTS, PROFILES, SPORTS, getNextId } from '@/lib/mock-data'

// GET /api/competitions
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sport  = searchParams.get('sport')
  const type   = searchParams.get('type')
  const status = searchParams.get('status')

  const auth = getUserFromRequest(req)

  if (useMockData) {
    let data = [...COMPETITIONS]
    if (sport && sport !== 'all')
      data = data.filter((c) => c.sport?.name.toLowerCase() === sport.toLowerCase() || String(c.sport_id) === sport)
    if (type)
      data = data.filter((c) => c.type === type)
    if (status)
      data = data.filter((c) => c.status === status)

    data = data.map((c) => {
      const participantIds = COMPETITION_PARTICIPANTS.filter((cp) => cp.competition_id === c.id).map((cp) => cp.user_id)
      const participants = PROFILES.filter((p) => participantIds.includes(p.user_id))
      const isJoined = auth ? participantIds.includes(auth.userId) : false
      return { ...c, participants, participants_count: Math.max(c.participants_count, participants.length), isJoined }
    })

    data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return NextResponse.json({ data })
  }

  return NextResponse.json({ data: [] })
}

// POST /api/competitions
export async function POST(req: NextRequest) {
  const auth = getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  try {
    const body = await req.json()
    const { title, sport_id, date, location, address, city, lat, lng, max_participants, description, type, distance_km, price_entry } = body

    if (!title || !sport_id || !date || !location || !city || !max_participants) {
      return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 })
    }

    if (useMockData) {
      const sport = SPORTS.find((s) => s.id === sport_id)
      const creator = PROFILES.find((p) => p.user_id === auth.userId)

      const newComp = {
        id: getNextId(COMPETITIONS),
        title,
        sport_id,
        sport,
        creator_id: auth.userId,
        creator,
        date,
        location,
        address,
        city,
        lat: lat ?? null,
        lng: lng ?? null,
        max_participants: parseInt(max_participants),
        participants_count: 0,
        participants: [],
        description,
        type: type ?? 'other',
        status: 'open' as const,
        distance_km: distance_km ? parseFloat(distance_km) : undefined,
        price_entry: price_entry ? parseFloat(price_entry) : undefined,
        created_at: new Date().toISOString(),
      }
      COMPETITIONS.push(newComp)
      return NextResponse.json({ data: newComp }, { status: 201 })
    }

    return NextResponse.json({ error: 'DB mode non activé.' }, { status: 500 })
  } catch (err) {
    console.error('[POST /api/competitions]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
