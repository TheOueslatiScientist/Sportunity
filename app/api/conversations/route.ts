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

  const { prisma } = await import('@/lib/prisma')
  const myId = auth.userId as number

  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: myId }, { receiverId: myId }] },
    include: { sender: true, receiver: true },
    orderBy: { createdAt: 'desc' },
  })

  // Group by partner, keep latest message per partner
  const partnersMap = new Map<number, { last: typeof messages[0]; unread: number }>()
  for (const msg of messages) {
    const partnerId = msg.senderId === myId ? msg.receiverId : msg.senderId
    if (!partnersMap.has(partnerId)) {
      const unread = messages.filter(
        (m) => m.senderId === partnerId && m.receiverId === myId && !m.read
      ).length
      partnersMap.set(partnerId, { last: msg, unread })
    }
  }

  const conversations = [...partnersMap.entries()].map(([partnerId, { last, unread }]) => {
    const partner = last.senderId === myId ? last.receiver : last.sender
    return {
      user: { id: partner.id, user_id: partner.id, name: partner.name, avatar_url: partner.avatarUrl, is_coach: partner.isCoach },
      last_message: { id: last.id, content: last.content, created_at: last.createdAt, sender_id: last.senderId },
      unread_count: unread,
    }
  })

  return NextResponse.json({ data: conversations })
}
