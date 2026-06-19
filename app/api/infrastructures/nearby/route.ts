import { NextRequest, NextResponse } from 'next/server'
import { useMockData } from '@/lib/db'
import { INFRASTRUCTURES } from '@/lib/mock-data'
import { haversineDistance } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') ?? '48.8566')
  const lng = parseFloat(searchParams.get('lng') ?? '2.3522')
  const radius = parseFloat(searchParams.get('radius') ?? '5') // km
  const type = searchParams.get('type')

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'lat et lng sont requis.' }, { status: 400 })
  }

  if (useMockData) {
    let data = INFRASTRUCTURES.map((infra) => ({
      ...infra,
      distance: haversineDistance(lat, lng, infra.lat, infra.lng),
    })).filter((infra) => infra.distance <= radius)

    if (type && type !== 'all') data = data.filter((i) => i.type === type)
    data.sort((a, b) => a.distance - b.distance)
    return NextResponse.json({ data })
  }

  // Real DB: uses bounding box approximation for performance, then haversine filter
  const { getDb } = await import('@/lib/db')
  const db = getDb()
  const delta = radius / 111 // 1 degree ≈ 111 km
  const conditions: string[] = [`lat BETWEEN $1 AND $2`, `lng BETWEEN $3 AND $4`]
  const values: unknown[] = [lat - delta, lat + delta, lng - delta, lng + delta]
  let i = 5
  if (type && type !== 'all') { conditions.push(`type = $${i++}`); values.push(type) }
  const res = await db.query(
    `SELECT *, (6371 * acos(cos(radians($${i})) * cos(radians(lat)) * cos(radians(lng) - radians($${i + 1})) + sin(radians($${i})) * sin(radians(lat)))) AS distance
     FROM infrastructures
     WHERE ${conditions.join(' AND ')}
     HAVING distance <= $${i + 2}
     ORDER BY distance`,
    [...values, lat, lng, radius]
  )
  return NextResponse.json({ data: res.rows })
}
