import { NextRequest, NextResponse } from 'next/server'
import { useMockData } from '@/lib/db'
import { INFRASTRUCTURES } from '@/lib/mock-data'
import { haversineDistance } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') ?? '48.8566')
  const lng = parseFloat(searchParams.get('lng') ?? '2.3522')
  const radius = parseFloat(searchParams.get('radius') ?? '5')
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

  try {
    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    const delta = radius / 111

    let query = supabaseAdmin
      .from('infrastructures')
      .select('id,name,type,address,lat,lng,"isPublic",status,"imageUrl"')
      .gte('lat', lat - delta).lte('lat', lat + delta)
      .gte('lng', lng - delta).lte('lng', lng + delta)

    if (type && type !== 'all') query = query.eq('type', type.toUpperCase())

    const { data: rows, error } = await query
    if (error) throw new Error(error.message)

    const data = (rows ?? [])
      .map((i: any) => ({
        id: i.id, name: i.name, type: i.type.toLowerCase(),
        address: i.address, lat: i.lat, lng: i.lng,
        is_public: i.isPublic, status: i.status.toLowerCase(),
        image_url: i.imageUrl,
        distance: haversineDistance(lat, lng, i.lat, i.lng),
      }))
      .filter((i: any) => i.distance <= radius)
      .sort((a: any, b: any) => a.distance - b.distance)

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[nearby]', err)
    return NextResponse.json({ error: String(err), data: [] }, { status: 500 })
  }
}
