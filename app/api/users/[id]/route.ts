import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { PROFILES } from '@/lib/mock-data'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id: idStr } = await params
  const id = parseInt(idStr)

  if (useMockData) {
    const profile = PROFILES.find((p) => p.user_id === id)
    if (!profile) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })
    return NextResponse.json({ data: profile })
  }

  const { getDb } = await import('@/lib/db')
  const db = getDb()
  const res = await db.query(
    `SELECT p.*, u.email,
     array_agg(json_build_object('id', s.id, 'name', s.name, 'icon', s.icon, 'color', s.color)) as sports
     FROM profiles p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN user_sports us ON us.user_id = p.user_id
     LEFT JOIN sports s ON s.id = us.sport_id
     WHERE p.user_id = $1
     GROUP BY p.id, u.email`,
    [id]
  )
  if (res.rows.length === 0) {
    return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })
  }
  return NextResponse.json({ data: res.rows[0] })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id: idStr } = await params
  const id = parseInt(idStr)
  if (auth.userId !== id) return NextResponse.json({ error: 'Interdit.' }, { status: 403 })

  const body = await req.json()

  if (useMockData) {
    const idx = PROFILES.findIndex((p) => p.user_id === id)
    if (idx === -1) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
    PROFILES[idx] = { ...PROFILES[idx], ...body }
    return NextResponse.json({ data: PROFILES[idx] })
  }

  const { getDb } = await import('@/lib/db')
  const db = getDb()
  const fields = ['name', 'bio', 'level', 'city', 'avatar_url', 'is_coach']
  const updates: string[] = []
  const values: unknown[] = []
  let i = 1
  for (const f of fields) {
    if (body[f] !== undefined) {
      updates.push(`${f} = $${i++}`)
      values.push(body[f])
    }
  }
  if (updates.length === 0) return NextResponse.json({ error: 'Aucun champ à mettre à jour.' }, { status: 400 })
  values.push(id)
  const res = await db.query(
    `UPDATE profiles SET ${updates.join(', ')}, updated_at = NOW() WHERE user_id = $${i} RETURNING *`,
    values
  )
  return NextResponse.json({ data: res.rows[0] })
}
