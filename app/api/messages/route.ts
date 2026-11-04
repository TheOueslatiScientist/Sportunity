import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { MESSAGES, PROFILES, getNextId } from '@/lib/mock-data'

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  try {
    const { receiver_id, content } = await req.json()
    if (!receiver_id || !content?.trim()) {
      return NextResponse.json({ error: 'Destinataire et contenu requis.' }, { status: 400 })
    }

    if (useMockData) {
      const sender = PROFILES.find((p) => p.user_id === auth.userId)
      const msg = {
        id: getNextId(MESSAGES),
        sender_id: auth.userId,
        receiver_id,
        content: content.trim(),
        read: false,
        created_at: new Date().toISOString(),
        sender,
      }
      MESSAGES.push(msg)
      return NextResponse.json({ data: msg }, { status: 201 })
    }

    const { getDb } = await import('@/lib/db')
    const db = getDb()
    const res = await db.query(
      `INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1,$2,$3) RETURNING *`,
      [auth.userId, receiver_id, content.trim()]
    )
    return NextResponse.json({ data: res.rows[0] }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/messages]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
