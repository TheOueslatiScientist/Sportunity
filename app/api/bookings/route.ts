import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'

// In-memory bookings store for mock mode (not exported — avoids Next.js route export error)
const BOOKINGS: Array<{
  id: number
  coach_id: number
  user_id: number | string
  date: string
  time_slot: string
  message: string
  status: 'pending' | 'confirmed' | 'cancelled'
  created_at: string
}> = []

let nextId = 1

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  if (useMockData) {
    const userBookings = BOOKINGS.filter((b) => b.user_id === auth.userId)
    return NextResponse.json({ data: userBookings })
  }

  // ── Real mode: Prisma ────────────────────────────────────────────────────────
  const { prisma } = await import('@/lib/prisma')
  const sessions = await prisma.coachSession.findMany({
    where: { userId: auth.userId },
    include: { coach: { include: { profile: true, sport: true } } },
    orderBy: { scheduledAt: 'desc' },
  })
  return NextResponse.json({ data: sessions })
}

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const body = await req.json()
  const { coach_id, date, time_slot, message = '' } = body

  if (!coach_id || !date || !time_slot) {
    return NextResponse.json({ error: 'coach_id, date et time_slot sont requis.' }, { status: 400 })
  }

  if (useMockData) {
    const booking = {
      id: nextId++,
      coach_id,
      user_id: auth.userId,
      date,
      time_slot,
      message,
      status: 'pending' as const,
      created_at: new Date().toISOString(),
    }
    BOOKINGS.push(booking)
    return NextResponse.json({ data: booking }, { status: 201 })
  }

  // ── Real mode: Prisma ────────────────────────────────────────────────────────
  try {
    const { prisma } = await import('@/lib/prisma')
    const scheduledAt = new Date(`${date}T${time_slot}`)
    const session = await prisma.coachSession.create({
      data: {
        coachId: coach_id,
        userId: auth.userId,
        scheduledAt,
        notes: message,
        status: 'PENDING',
      },
      include: { coach: { include: { profile: true, sport: true } } },
    })
    return NextResponse.json({ data: session }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/bookings]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
