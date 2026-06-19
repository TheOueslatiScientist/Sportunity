import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { TOURNAMENTS, PROFILES, SPORTS, getNextId } from '@/lib/mock-data'

// GET /api/tournaments
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sport  = searchParams.get('sport')
  const status = searchParams.get('status')

  if (useMockData) {
    let data = [...TOURNAMENTS]
    if (sport && sport !== 'all')
      data = data.filter((t) => t.sport?.name.toLowerCase() === sport.toLowerCase() || String(t.sport_id) === sport)
    if (status)
      data = data.filter((t) => t.status === status)
    data.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    return NextResponse.json({ data })
  }

  return NextResponse.json({ data: [] })
}

// POST /api/tournaments
export async function POST(req: NextRequest) {
  const auth = getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  try {
    const body = await req.json()
    const { title, sport_id, start_date, end_date, location, address, city, lat, lng, max_teams, description, prize } = body

    if (!title || !sport_id || !start_date || !location || !city || !max_teams) {
      return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 })
    }

    if (useMockData) {
      const sport = SPORTS.find((s) => s.id === sport_id)
      const creator = PROFILES.find((p) => p.user_id === auth.userId)

      const newTournament = {
        id: getNextId(TOURNAMENTS),
        title,
        sport_id,
        sport,
        creator_id: auth.userId,
        creator,
        start_date,
        end_date,
        location,
        address,
        city,
        lat: lat ?? null,
        lng: lng ?? null,
        max_teams: parseInt(max_teams),
        teams_count: 0,
        description,
        prize,
        status: 'open' as const,
        created_at: new Date().toISOString(),
      }
      TOURNAMENTS.push(newTournament)
      return NextResponse.json({ data: newTournament }, { status: 201 })
    }

    return NextResponse.json({ error: 'DB mode non activé.' }, { status: 500 })
  } catch (err) {
    console.error('[POST /api/tournaments]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
