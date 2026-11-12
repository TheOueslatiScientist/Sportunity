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
    const { prisma } = await import('@/lib/prisma')
    const delta = radius / 111
    const infras = await prisma.infrastructure.findMany({
      where: {
        lat: { gte: lat - delta, lte: lat + delta },
        lng: { gte: lng - delta, lte: lng + delta },
        ...(type && type !== 'all' ? { type: type.toUpperCase() as any } : {}),
      },
    })

    const data = infras
      .map((i) => ({
        id: i.id, name: i.name, type: i.type.toLowerCase(),
        address: i.address, lat: i.lat, lng: i.lng,
        is_public: i.isPublic, status: i.status.toLowerCase(),
        image_url: i.imageUrl,
        distance: haversineDistance(lat, lng, i.lat, i.lng),
      }))
      .filter((i) => i.distance <= radius)
      .sort((a, b) => a.distance - b.distance)

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[nearby]', err)
    return NextResponse.json({ error: String(err), data: [] }, { status: 500 })
  }
}
