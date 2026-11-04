import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { MESSAGES } from '@/lib/mock-data'

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await getUserFromRequest(req)
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

  const { prisma } = await import('@/lib/prisma')
  const myId = auth.userId as number

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId },
      ],
    },
    include: { sender: true },
    orderBy: { createdAt: 'asc' },
  })

  await prisma.message.updateMany({
    where: { senderId: otherId, receiverId: myId, read: false },
    data: { read: true },
  })

  return NextResponse.json({ data: messages })
}
