import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { PROFILES } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const auth = getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const sport = searchParams.get('sport')
  const city = searchParams.get('city')

  if (useMockData) {
    let users = PROFILES.filter((p) => p.user_id !== auth.userId)
    if (sport) {
      users = users.filter((p) => p.sports?.some((s) => s.name.toLowerCase() === sport.toLowerCase()))
    }
    if (city) {
      users = users.filter((p) => p.city?.toLowerCase().includes(city.toLowerCase()))
    }
    return NextResponse.json({ data: users })
  }

  const { getDb } = await import('@/lib/db')
  const db = getDb()
  const res = await db.query(
    `SELECT p.*, array_agg(json_build_object('id', s.id, 'name', s.name, 'icon', s.icon, 'color', s.color)) as sports
     FROM profiles p
     LEFT JOIN user_sports us ON us.user_id = p.user_id
     LEFT JOIN sports s ON s.id = us.sport_id
     WHERE p.user_id != $1
     GROUP BY p.id`,
    [auth.userId]
  )
  return NextResponse.json({ data: res.rows })
}
