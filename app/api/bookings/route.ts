import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'

const BOOKINGS: any[] = []
let nextId = 1

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  if (useMockData) {
    return NextResponse.json({ data: BOOKINGS.filter((b) => b.user_id === auth.userId) })
  }

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { data: sessions } = await supabaseAdmin
    .from('coach_sessions')
    .select('id,coachId,clientId,date,durationMinutes,location,city,status,notes,price,createdAt')
    .eq('clientId', auth.userId as number)
    .order('date', { ascending: false })

  return NextResponse.json({ data: (sessions ?? []).map((s: any) => ({
    id: s.id, coach_id: s.coachId, client_id: s.clientId,
    date: s.date, duration_minutes: s.durationMinutes,
    location: s.location, city: s.city, status: s.status?.toLowerCase(),
    notes: s.notes, price: s.price, created_at: s.createdAt,
  })) })
}

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const body = await req.json()
  const { coach_id, date, time_slot, message = '' } = body
  if (!coach_id || !date || !time_slot)
    return NextResponse.json({ error: 'coach_id, date et time_slot sont requis.' }, { status: 400 })

  if (useMockData) {
    const booking = { id: nextId++, coach_id, user_id: auth.userId, date, time_slot, message, status: 'pending', created_at: new Date().toISOString() }
    BOOKINGS.push(booking)
    return NextResponse.json({ data: booking }, { status: 201 })
  }

  try {
    const { supabaseAdmin } = await import('@/lib/supabase-admin')

    // Convert weekday name + time slot to next occurrence datetime
    const DAY_INDEX: Record<string, number> = { lun: 1, mar: 2, mer: 3, jeu: 4, ven: 5, sam: 6, dim: 0 }
    const targetDay = DAY_INDEX[date as string] ?? -1
    let sessionDate: Date
    if (targetDay === -1) {
      // Fallback: treat date as ISO string if not a weekday code
      sessionDate = new Date(`${date}T${time_slot}`)
    } else {
      const now = new Date()
      const diff = (targetDay - now.getDay() + 7) % 7 || 7
      sessionDate = new Date(now)
      sessionDate.setDate(now.getDate() + diff)
      const [h, m] = (time_slot as string).split(':').map(Number)
      sessionDate.setHours(h ?? 10, m ?? 0, 0, 0)
    }

    const { data: session, error } = await supabaseAdmin
      .from('coach_sessions')
      .insert({
        coachId: coach_id, clientId: auth.userId as number,
        date: sessionDate.toISOString(),
        location: '', notes: message, status: 'SCHEDULED', durationMinutes: 60,
      })
      .select()
      .single()
    if (error) throw error

    // Notify the coach
    const { data: coach } = await supabaseAdmin.from('coaches').select('userId').eq('id', coach_id).single()
    if (coach?.userId) {
      const { data: client } = await supabaseAdmin.from('profiles').select('name').eq('id', auth.userId as number).single()
      const { createNotification } = await import('@/lib/notify')
      await createNotification({
        userId: coach.userId as number,
        type: 'match_joined',
        title: `${client?.name ?? 'Un sportif'} a réservé une séance`,
        body: `${date} à ${time_slot}`,
        relatedId: session.id as number,
      })
    }

    return NextResponse.json({ data: session }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/bookings]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
