import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { InfraType } from '@prisma/client'

export const maxDuration = 300 // 5 min — Vercel Pro/Fluid

const MEL_EPCI = '200093201'
const API_BASE = 'https://equipements.sports.gouv.fr/api/explore/v2.1/catalog/datasets/data-es/records'
const ADMIN_SECRET = process.env.ADMIN_IMPORT_SECRET ?? 'sportunity-import-2024'

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

async function fetchPage(offset: number, limit = 100): Promise<RESRecord[]> {
  const params = new URLSearchParams({
    limit: String(limit), offset: String(offset),
    where: `epci_code='${MEL_EPCI}'`,
    select: 'equip_nom,inst_adresse,inst_cp,new_name,equip_coordonnees,equip_x,equip_y,equip_type_name,aps_name,equip_acc_libre',
  })
  const res = await fetch(`${API_BASE}?${params}`)
  const data = await res.json() as { results: RESRecord[] }
  return data.results ?? []
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Get total
  const firstRes = await fetch(`${API_BASE}?limit=1&where=epci_code%3D'${MEL_EPCI}'`)
  const firstData = await firstRes.json() as { total_count: number }
  const total: number = firstData.total_count

  // 2. Fetch all pages in parallel (10 at a time)
  const limit = 100
  const offsets = Array.from({ length: Math.ceil(total / limit) }, (_, i) => i * limit)
  const allRecords: RESRecord[] = []

  for (let i = 0; i < offsets.length; i += 10) {
    const batch = offsets.slice(i, i + 10)
    const pages = await Promise.all(batch.map((o) => fetchPage(o, limit)))
    pages.forEach((p) => allRecords.push(...p))
  }

  // 3. Deduplicate + validate
  const seen = new Set<string>()
  const toInsert: Parameters<typeof prisma.infrastructure.createMany>[0]['data'] = []

  for (const rec of allRecords) {
    const lat = rec.equip_coordonnees?.lat ?? (rec.equip_y ? parseFloat(rec.equip_y) : null)
    const lng = rec.equip_coordonnees?.lon ?? (rec.equip_x ? parseFloat(rec.equip_x) : null)
    const name = rec.equip_nom?.trim()
    if (!lat || !lng || !name) continue

    const key = `${name}|${lat.toFixed(5)}|${lng.toFixed(5)}`
    if (seen.has(key)) continue
    seen.add(key)

    toInsert.push({
      name,
      type: mapType(rec.equip_type_name ?? '', rec.aps_name ?? []),
      address: [rec.inst_adresse, rec.inst_cp, rec.new_name].filter(Boolean).join(', '),
      lat,
      lng,
      isPublic: rec.equip_acc_libre === 'true',
      status: 'AVAILABLE',
    })
  }

  // 4. Clear old data + bulk insert
  await prisma.infrastructure.deleteMany({})

  let inserted = 0
  for (let i = 0; i < toInsert.length; i += 500) {
    await prisma.infrastructure.createMany({ data: toInsert.slice(i, i + 500) })
    inserted += Math.min(500, toInsert.length - i)
  }

  return NextResponse.json({ success: true, total, inserted })
}
