import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { MESSAGES } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ count: 0 })

  // ── Mock mode ────────────────────────────────────────────────────────────────
  if (useMockData) {
    const count = MESSAGES.filter((m) => m.receiver_id === auth.userId && !m.read).length
    return NextResponse.json({ count })
  }

  // ── Real mode: Prisma ────────────────────────────────────────────────────────
  const { prisma } = await import('@/lib/prisma')
  const count = await prisma.message.count({
    where: { receiverId: auth.userId, read: false },
  })
  return NextResponse.json({ count })
}
