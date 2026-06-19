import { NextRequest, NextResponse } from 'next/server'
import { useMockData } from '@/lib/db'
import { INFRASTRUCTURES } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const isPublic = searchParams.get('public')

  // ── Mock mode ────────────────────────────────────────────────────────────────
  if (useMockData) {
    let data = [...INFRASTRUCTURES]
    if (type && type !== 'all') data = data.filter((i) => i.type === type)
    if (status && status !== 'all') data = data.filter((i) => i.status === status)
    if (isPublic === 'true') data = data.filter((i) => i.is_public)
    if (isPublic === 'false') data = data.filter((i) => !i.is_public)
    return NextResponse.json({ data })
  }

  // ── Real mode: Prisma ────────────────────────────────────────────────────────
  const { prisma } = await import('@/lib/prisma')

  const where: any = {}
  if (type && type !== 'all') where.type = type.toUpperCase()
  if (status && status !== 'all') where.status = status.toUpperCase()
  if (isPublic === 'true') where.isPublic = true
  if (isPublic === 'false') where.isPublic = false

  const infras = await prisma.infrastructure.findMany({
    where,
    include: { sport: true },
    orderBy: { name: 'asc' },
  })

  const data = infras.map((i) => ({
    id: i.id,
    name: i.name,
    type: i.type.toLowerCase(),
    address: i.address,
    lat: i.lat,
    lng: i.lng,
    is_public: i.isPublic,
    status: i.status.toLowerCase(),
    image_url: i.imageUrl,
    sport: i.sport,
  }))

  return NextResponse.json({ data })
}
