import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { MESSAGES, PROFILES } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  if (useMockData) {
    const partners = new Map<number, { unread: number; last: (typeof MESSAGES)[0] }>()
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
        return { user: profile, last_message: last, unread_count: unread }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b!.last_message.created_at).getTime() - new Date(a!.last_message.created_at).getTime())
    return NextResponse.json({ data: conversations })
  }

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const myId = auth.userId as number

  const { data: messages } = await supabaseAdmin
    .from('messages')
    .select('*')
    .or(`senderId.eq.${myId},receiverId.eq.${myId}`)
    .order('createdAt', { ascending: false })

  if (!messages?.length) return NextResponse.json({ data: [] })

  // Group by partner, keep latest message per partner
  const partnersMap = new Map<number, { last: any; unread: number }>()
  for (const msg of messages) {
    const partnerId = msg.senderId === myId ? msg.receiverId : msg.senderId
    if (!partnersMap.has(partnerId)) {
      const unread = messages.filter((m: any) => m.senderId === partnerId && m.receiverId === myId && !m.read).length
      partnersMap.set(partnerId, { last: msg, unread })
    }
  }

  const partnerIds = [...partnersMap.keys()]
  const { data: profiles } = await supabaseAdmin.from('profiles').select('id,name,avatarUrl,isCoach').in('id', partnerIds)
  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]))

  const conversations = [...partnersMap.entries()].map(([partnerId, { last, unread }]) => {
    const p = profileMap[partnerId]
    return {
      user: { id: partnerId, user_id: partnerId, name: p?.name, avatar_url: p?.avatarUrl, is_coach: p?.isCoach },
      last_message: { id: last.id, content: last.content, created_at: last.createdAt, sender_id: last.senderId },
      unread_count: unread,
    }
  })

  return NextResponse.json({ data: conversations })
}
