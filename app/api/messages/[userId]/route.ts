import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { MESSAGES } from '@/lib/mock-data'

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const auth = getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { userId } = await params
  const otherId = parseInt(userId)

  if (useMockData) {
    const conversation = MESSAGES.filter(
      (m) =>
        (m.sender_id === auth.userId && m.receiver_id === otherId) ||
        (m.sender_id === otherId && m.receiver_id === auth.userId)
    ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    return NextResponse.json({ data: conversation })
  }

  const { getDb } = await import('@/lib/db')
  const db = getDb()
  const res = await db.query(
    `SELECT m.*, json_build_object('id', p.id, 'name', p.name, 'avatar_url', p.avatar_url) as sender
     FROM messages m
     JOIN profiles p ON p.user_id = m.sender_id
     WHERE (m.sender_id = $1 AND m.receiver_id = $2)
        OR (m.sender_id = $2 AND m.receiver_id = $1)
     ORDER BY m.created_at ASC`,
    [auth.userId, otherId]
  )
  // Mark as read
  await db.query(
    'UPDATE messages SET read = true WHERE sender_id = $1 AND receiver_id = $2',
    [otherId, auth.userId]
  )
  return NextResponse.json({ data: res.rows })
}
