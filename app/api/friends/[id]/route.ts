import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { FRIENDSHIPS } from '@/lib/mock-data'

// PATCH /api/friends/[id] — accept or reject a request { action: 'accept' | 'reject' }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const friendshipId = parseInt(id)
  const { action } = await req.json()

  if (useMockData) {
    const f = FRIENDSHIPS.find((x) => x.id === friendshipId && x.addressee_id === auth.userId)
    if (!f) return NextResponse.json({ error: 'Demande introuvable.' }, { status: 404 })
    f.status = action === 'accept' ? 'accepted' : 'rejected'
    return NextResponse.json({ data: f })
  }

  const { getDb } = await import('@/lib/db')
  const db = getDb()
  const res = await db.query(
    `UPDATE friendships SET status = $1 WHERE id = $2 AND addressee_id = $3 RETURNING *`,
    [action === 'accept' ? 'accepted' : 'rejected', friendshipId, auth.userId]
  )
  if (res.rowCount === 0) return NextResponse.json({ error: 'Demande introuvable.' }, { status: 404 })
  return NextResponse.json({ data: res.rows[0] })
}

// DELETE /api/friends/[id] — remove a friend or cancel a request
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const friendshipId = parseInt(id)

  if (useMockData) {
    const idx = FRIENDSHIPS.findIndex(
      (f) => f.id === friendshipId &&
        (f.requester_id === auth.userId || f.addressee_id === auth.userId)
    )
    if (idx === -1) return NextResponse.json({ error: 'Amitié introuvable.' }, { status: 404 })
    FRIENDSHIPS.splice(idx, 1)
    return NextResponse.json({ message: 'Amitié supprimée.' })
  }

  const { getDb } = await import('@/lib/db')
  const db = getDb()
  await db.query(
    'DELETE FROM friendships WHERE id = $1 AND (requester_id = $2 OR addressee_id = $2)',
    [friendshipId, auth.userId]
  )
  return NextResponse.json({ message: 'Amitié supprimée.' })
}
