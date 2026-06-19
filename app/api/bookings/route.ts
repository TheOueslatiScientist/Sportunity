import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'

// In-memory bookings store for mock mode
export const BOOKINGS: Array<{
  id: number
  coach_id: number
  user_id: number
  date: string
  time_slot: string
  message: string
  status: 'pending' | 'confirmed' | 'cancelled'
  created_at: string
}> = []

let nextId = 1

export async function GET(req: NextRequest) {
  const auth = getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  if (useMockData) {
    const userBookings = BOOKINGS.filter((b) => b.user_id === auth.userId)
    return NextResponse.json({ data: userBookings })
  }

  return NextResponse.json({ data: [] })
}

export async function POST(req: NextRequest) {
  const auth = getUserFromRequest(req)
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

  const { getDb } = await import('@/lib/db')
  const db = getDb()

  const res = await db.query(
    `INSERT INTO bookings (coach_id, user_id, date, time_slot, message, status)
     VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
    [coach_id, auth.userId, date, time_slot, message]
  )
  return NextResponse.json({ data: res.rows[0] }, { status: 201 })
}
