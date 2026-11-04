import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { MESSAGES, PROFILES } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  if (useMockData) {
    // Build conversation list: find all unique partners
    const partners = new Map<number, { unread: number; last: typeof MESSAGES[0] }>()

    for (const msg of MESSAGES) {
      const isMe = msg.sender_id === auth.userId || msg.receiver_id === auth.userId
      if (!isMe) continue

      const partnerId = msg.sender_id === auth.userId ? msg.receiver_id : msg.sender_id
      const existing = partners.get(partnerId)

      if (!existing || new Date(msg.created_at) > new Date(existing.last.created_at)) {
        const unreadCount = MESSAGES.filter(
          (m) => m.sender_id === partnerId && m.receiver_id === auth.userId && !m.read
        ).length
        partners.set(partnerId, { unread: unreadCount, last: msg })
      }
    }

    const conversations = [...partners.entries()]
      .map(([partnerId, { unread, last }]) => {
        const profile = PROFILES.find((p) => p.user_id === partnerId)
        if (!profile) return null
        return {
          user: profile,
          last_message: last,
          unread_count: unread,
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b!.last_message.created_at).getTime() - new Date(a!.last_message.created_at).getTime())

    return NextResponse.json({ data: conversations })
  }

  const { getDb } = await import('@/lib/db')
  const db = getDb()
  const res = await db.query(
    `SELECT DISTINCT ON (partner_id)
      partner_id,
      json_build_object('id', p.id, 'name', p.name, 'avatar_url', p.avatar_url, 'user_id', p.user_id, 'is_coach', p.is_coach) as user,
      json_build_object('id', m.id, 'content', m.content, 'created_at', m.created_at, 'sender_id', m.sender_id) as last_message,
      COUNT(unread.id) as unread_count
     FROM (
       SELECT CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as partner_id, id, created_at
       FROM messages WHERE sender_id = $1 OR receiver_id = $1
     ) convo
     JOIN messages m ON m.id = convo.id
     JOIN profiles p ON p.user_id = convo.partner_id
     LEFT JOIN messages unread ON unread.sender_id = convo.partner_id AND unread.receiver_id = $1 AND unread.read = false
     GROUP BY partner_id, p.id, m.id
     ORDER BY partner_id, convo.created_at DESC`,
    [auth.userId]
  )
  return NextResponse.json({ data: res.rows })
}
