/**
 * Import sports infrastructure from RES (Recensement des Équipements Sportifs)
 * API: https://equipements.sports.gouv.fr
 * Zone: Métropole Européenne de Lille (MEL) — EPCI 200093201
 *
 * Usage: npx tsx prisma/import-mel-infra.ts
 */
import { PrismaClient, InfraType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const pool = new Pool({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

const MEL_EPCI = '200093201'
const API_BASE = 'https://equipements.sports.gouv.fr/api/explore/v2.1/catalog/datasets/data-es/records'

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

async function fetchPage(offset: number, limit = 100) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    where: `epci_code='${MEL_EPCI}'`,
    select: 'equip_nom,inst_adresse,inst_cp,new_name,equip_coordonnees,equip_x,equip_y,equip_type_name,aps_name,equip_acc_libre',
  })
  const res = await fetch(`${API_BASE}?${params}`)
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  const data = await res.json() as { total_count: number; results: RESRecord[] }
  return { results: data.results, total: data.total_count }
}

async function main() {
  await prisma.$connect()

  const { total } = await fetchPage(0, 1)
  console.log(`Équipements MEL disponibles: ${total}`)

  // Collect all valid records first
  const toInsert: Parameters<typeof prisma.infrastructure.create>[0]['data'][] = []
  const seen = new Set<string>()
  let offset = 0
  const limit = 100

  while (offset < total) {
    const { results } = await fetchPage(offset, limit)

    for (const rec of results) {
      const lat = rec.equip_coordonnees?.lat ?? (rec.equip_y ? parseFloat(rec.equip_y) : null)
      const lng = rec.equip_coordonnees?.lon ?? (rec.equip_x ? parseFloat(rec.equip_x) : null)
      const name = rec.equip_nom?.trim()

      if (!lat || !lng || !name) continue

      // Deduplicate by name+coords
      const key = `${name}|${lat.toFixed(5)}|${lng.toFixed(5)}`
      if (seen.has(key)) continue
      seen.add(key)

      const city = rec.new_name ?? ''
      const address = [rec.inst_adresse, rec.inst_cp, city].filter(Boolean).join(', ')

      toInsert.push({
        name,
        type: mapType(rec.equip_type_name ?? '', rec.aps_name ?? []),
        address,
        lat,
        lng,
        isPublic: rec.equip_acc_libre === 'true',
        status: 'AVAILABLE',
      })
    }

    offset += limit
    process.stdout.write(`\rRécupération: ${Math.min(offset, total)}/${total}`)
    await new Promise((r) => setTimeout(r, 150))
  }

  console.log(`\n${toInsert.length} équipements valides récupérés`)
  console.log('Suppression des anciennes infrastructures...')
  await prisma.infrastructure.deleteMany({})

  console.log('Insertion en base...')
  // Insert in batches of 500
  const batchSize = 500
  let inserted = 0
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize)
    await prisma.infrastructure.createMany({ data: batch })
    inserted += batch.length
    process.stdout.write(`\rInsertion: ${inserted}/${toInsert.length}`)
  }

  console.log(`\nTerminé ! ${inserted} infrastructures importées dans la base.`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('\nErreur:', e)
  prisma.$disconnect()
  process.exit(1)
})
