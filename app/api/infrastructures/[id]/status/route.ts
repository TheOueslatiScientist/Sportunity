import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import type { TerrainStatusValue } from '@/types'

// In-memory mock store (dev only)
const mockStore = new Map<number, { status: TerrainStatusValue; nbJoueurs?: number; updatedAt: string }>()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const infraId = parseInt(id)
  if (isNaN(infraId)) return NextResponse.json({ error: 'ID invalide.' }, { status: 400 })

  if (useMockData) {
    const cached = mockStore.get(infraId)
    return NextResponse.json({ data: cached ?? { status: 'inconnu' } })
  }

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { data: row } = await supabaseAdmin
    .from('terrain_statuses')
    .select('status, "nbJoueurs", "createdAt"')
    .eq('infrastructureId', infraId)
    .gt('expireA', new Date().toISOString())
    .order('createdAt', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!row) return NextResponse.json({ data: { status: 'inconnu' as TerrainStatusValue } })

  return NextResponse.json({
    data: {
      status: row.status as TerrainStatusValue,
      nbJoueurs: row.nbJoueurs ?? undefined,
      updatedAt: row.createdAt,
    },
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })

  const { id } = await params
  const infraId = parseInt(id)
  if (isNaN(infraId)) return NextResponse.json({ error: 'ID invalide.' }, { status: 400 })

  const body: unknown = await req.json()
  const { status, nb_joueurs } = body as { status: unknown; nb_joueurs?: unknown }

  if (status !== 'libre' && status !== 'occupe') {
    return NextResponse.json({ error: "Statut invalide. Valeurs acceptées : 'libre', 'occupe'." }, { status: 400 })
  }
  const validStatus = status as 'libre' | 'occupe'
  const nbJoueurs = typeof nb_joueurs === 'number' && nb_joueurs > 0 ? Math.min(nb_joueurs, 100) : null
  const expireA = new Date(Date.now() + 2 * 60 * 60 * 1000)

  if (useMockData) {
    mockStore.set(infraId, { status: validStatus, nbJoueurs: nbJoueurs ?? undefined, updatedAt: new Date().toISOString() })
    return NextResponse.json({ data: { status: validStatus, nbJoueurs, updatedAt: new Date().toISOString() } }, { status: 201 })
  }

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { data: row, error } = await supabaseAdmin
    .from('terrain_statuses')
    .upsert(
      {
        infrastructureId: infraId,
        status: validStatus,
        nbJoueurs,
        signalePar: auth.userId,
        expireA: expireA.toISOString(),
        createdAt: new Date().toISOString(),
      },
      { onConflict: 'infrastructureId,signalePar' },
    )
    .select('status, "nbJoueurs", "createdAt"')
    .single()

  if (error) {
    console.error('[POST terrain_status]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: { status: row.status as TerrainStatusValue, nbJoueurs: row.nbJoueurs ?? undefined, updatedAt: row.createdAt },
  }, { status: 201 })
}
