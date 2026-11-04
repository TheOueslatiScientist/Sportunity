import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { COACHES, PROFILES } from '@/lib/mock-data'

// ── GET /api/coaches/:id ──────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const coachId = parseInt(id)

  if (useMockData) {
    const coach = COACHES.find((c) => c.id === coachId)
    if (!coach) return NextResponse.json({ error: 'Coach introuvable.' }, { status: 404 })
    return NextResponse.json({ data: coach })
  }

  const { getDb } = await import('@/lib/db')
  const db = getDb()
  const res = await db.query(
    `SELECT c.*,
     json_build_object('id', p.id, 'name', p.name, 'avatar_url', p.avatar_url, 'city', p.city, 'bio', p.bio) as profile,
     json_build_object('id', s.id, 'name', s.name, 'icon', s.icon, 'color', s.color) as sport
     FROM coaches c
     JOIN profiles p ON p.user_id = c.user_id
     JOIN sports s ON s.id = c.sport_id
     WHERE c.id = $1`,
    [coachId]
  )
  if (res.rows.length === 0) return NextResponse.json({ error: 'Coach introuvable.' }, { status: 404 })
  return NextResponse.json({ data: res.rows[0] })
}

// ── PUT /api/coaches/:id ──────────────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const coachId = parseInt(id)
  const body = await req.json()

  if (useMockData) {
    const idx = COACHES.findIndex((c) => c.id === coachId)
    if (idx === -1) return NextResponse.json({ error: 'Coach introuvable.' }, { status: 404 })
    if (COACHES[idx].user_id !== auth.userId)
      return NextResponse.json({ error: 'Interdit.' }, { status: 403 })
    COACHES[idx] = { ...COACHES[idx], ...body }
    return NextResponse.json({ data: COACHES[idx] })
  }

  const { getDb } = await import('@/lib/db')
  const db = getDb()
  const fields = ['sport_id','hourly_rate','description','experience_years','certifications','specialties','city','availability_text','is_available_now']
  const updates: string[] = []
  const values: unknown[] = []
  let i = 1
  for (const f of fields) {
    if (body[f] !== undefined) {
      updates.push(`${f} = $${i++}`)
      values.push(body[f])
    }
  }
  if (!updates.length) return NextResponse.json({ error: 'Rien à modifier.' }, { status: 400 })
  values.push(coachId, auth.userId)
  const res = await db.query(
    `UPDATE coaches SET ${updates.join(', ')} WHERE id = $${i} AND user_id = $${i + 1} RETURNING *`,
    values
  )
  if (!res.rows.length) return NextResponse.json({ error: 'Interdit ou introuvable.' }, { status: 403 })
  return NextResponse.json({ data: res.rows[0] })
}
