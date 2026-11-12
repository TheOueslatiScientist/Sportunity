import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { InfraType, Prisma } from '@prisma/client'

const MEL_EPCI = '200093201'
const API_BASE = 'https://equipements.sports.gouv.fr/api/explore/v2.1/catalog/datasets/data-es/records'
const ADMIN_SECRET = process.env.ADMIN_IMPORT_SECRET ?? 'sportunity-import-2024'
const PAGE_SIZE = 100

function mapType(typeName: string, apsNames: string[]): InfraType {
  const t = (typeName ?? '').toLowerCase()
  const a = (apsNames ?? []).join(' ').toLowerCase()
  if (t.includes('football') || a.includes('football') || a.includes('futsal')) return InfraType.FOOTBALL
  if (t.includes('basket')   || a.includes('basket'))                            return InfraType.BASKETBALL
  if (t.includes('padel')    || a.includes('padel'))                             return InfraType.PADEL
  if (t.includes('tennis')   || a.includes('tennis'))                            return InfraType.TENNIS
  if (t.includes('volley')   || a.includes('volley'))                            return InfraType.VOLLEYBALL
  if (t.includes('natation') || t.includes('piscine') || t.includes('bassin')
      || a.includes('natation'))                                                  return InfraType.SWIMMING
  if (t.includes('athlétisme') || t.includes('piste') || t.includes('parcours')
      || a.includes('course') || a.includes('athlé'))                            return InfraType.RUNNING
  if (t.includes('fitness') || t.includes('musculation') || t.includes('gym')
      || a.includes('fitness') || a.includes('musculation'))                     return InfraType.GYM
  return InfraType.OTHER
}

interface RESRecord {
  equip_nom: string
  inst_adresse?: string
  inst_cp?: string
  new_name?: string
  equip_coordonnees?: { lon: number; lat: number }
  equip_x?: string
  equip_y?: string
  equip_type_name?: string
  aps_name?: string[]
  equip_acc_libre?: string
}

// GET ?page=0 → returns total pages (init call, clears DB on page 0)
// POST ?page=N → imports page N
export async function GET(req: NextRequest) {
  if (req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const res = await fetch(`${API_BASE}?limit=1&where=epci_code%3D'${MEL_EPCI}'`)
  const data = await res.json() as { total_count: number }
  const total = data.total_count
  const pages = Math.ceil(total / PAGE_SIZE)
  return NextResponse.json({ total, pages, pageSize: PAGE_SIZE })
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') ?? '0', 10)
  const offset = page * PAGE_SIZE

  // On first page: clear existing data
  if (page === 0) {
    await prisma.infrastructure.deleteMany({})
  }

  // Fetch one page from RES API
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE), offset: String(offset),
    where: `epci_code='${MEL_EPCI}'`,
    select: 'equip_nom,inst_adresse,inst_cp,new_name,equip_coordonnees,equip_x,equip_y,equip_type_name,aps_name,equip_acc_libre',
  })
  const res = await fetch(`${API_BASE}?${params}`)
  const data = await res.json() as { results: RESRecord[] }
  const records = data.results ?? []

  // Filter + map
  const toInsert: Prisma.InfrastructureCreateManyInput[] = []
  for (const rec of records) {
    const lat = rec.equip_coordonnees?.lat ?? (rec.equip_y ? parseFloat(rec.equip_y) : null)
    const lng = rec.equip_coordonnees?.lon ?? (rec.equip_x ? parseFloat(rec.equip_x) : null)
    const name = rec.equip_nom?.trim()
    if (!lat || !lng || !name) continue
    toInsert.push({
      name,
      type: mapType(rec.equip_type_name ?? '', rec.aps_name ?? []),
      address: [rec.inst_adresse, rec.inst_cp, rec.new_name].filter(Boolean).join(', '),
      lat, lng,
      isPublic: rec.equip_acc_libre === 'true',
      status: 'AVAILABLE',
    })
  }

  if (toInsert.length > 0) {
    await prisma.infrastructure.createMany({ data: toInsert })
  }

  return NextResponse.json({ page, offset, fetched: records.length, inserted: toInsert.length })
}
