import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { FRIENDSHIPS, PROFILES, getNextId } from '@/lib/mock-data'

// GET /api/friends — list accepted friends + pending requests for current user
export async function GET(req: NextRequest) {
  const auth = getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  if (useMockData) {
    const accepted = FRIENDSHIPS.filter(
      (f) => f.status === 'accepted' &&
        (f.requester_id === auth.userId || f.addressee_id === auth.userId)
    ).map((f) => ({
      ...f,
      friend: f.requester_id === auth.userId ? f.addressee : f.requester,
    }))

    const pending_received = FRIENDSHIPS.filter(
      (f) => f.status === 'pending' && f.addressee_id === auth.userId
    ).map((f) => ({ ...f, friend: f.requester }))

    const pending_sent = FRIENDSHIPS.filter(
      (f) => f.status === 'pending' && f.requester_id === auth.userId
    ).map((f) => ({ ...f, friend: f.addressee }))

    return NextResponse.json({ data: { accepted, pending_received, pending_sent } })
  }

  const { getDb } = await import('@/lib/db')
  const db = getDb()
  const res = await db.query(
    `SELECT f.*,
      CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END as friend_user_id,
      json_build_object('id', p.id, 'name', p.name, 'avatar_url', p.avatar_url, 'city', p.city, 'is_coach', p.is_coach) as friend
     FROM friendships f
     JOIN profiles p ON p.user_id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
     WHERE (f.requester_id = $1 OR f.addressee_id = $1) AND f.status = 'accepted'`,
    [auth.userId]
  )
  return NextResponse.json({ data: { accepted: res.rows, pending_received: [], pending_sent: [] } })
}

// POST /api/friends — send a friend request { addressee_id }
export async function POST(req: NextRequest) {
  const auth = getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { addressee_id } = await req.json()
  if (!addressee_id) return NextResponse.json({ error: 'addressee_id requis.' }, { status: 400 })
  if (addressee_id === auth.userId) return NextResponse.json({ error: 'Vous ne pouvez pas vous ajouter vous-même.' }, { status: 400 })

  if (useMockData) {
    const existing = FRIENDSHIPS.find(
      (f) =>
        (f.requester_id === auth.userId && f.addressee_id === addressee_id) ||
        (f.requester_id === addressee_id && f.addressee_id === auth.userId)
    )
    if (existing) return NextResponse.json({ error: 'Une demande existe déjà.', data: existing }, { status: 409 })

    const requester = PROFILES.find((p) => p.user_id === auth.userId)
    const addressee = PROFILES.find((p) => p.user_id === addressee_id)
    const friendship = {
      id: getNextId(FRIENDSHIPS),
      requester_id: auth.userId,
      addressee_id,
      status: 'pending' as const,
      created_at: new Date().toISOString(),
      requester,
      addressee,
    }
    FRIENDSHIPS.push(friendship)
    return NextResponse.json({ data: friendship }, { status: 201 })
  }

  const { getDb } = await import('@/lib/db')
  const db = getDb()
  try {
    const res = await db.query(
      'INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1, $2, $3) RETURNING *',
      [auth.userId, addressee_id, 'pending']
    )
    return NextResponse.json({ data: res.rows[0] }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Une demande existe déjà.' }, { status: 409 })
  }
}
