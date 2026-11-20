import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { PROFILES } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const sport = searchParams.get('sport')
  const city = searchParams.get('city')

  if (useMockData) {
    let users = PROFILES.filter((p) => p.user_id !== auth.userId)
    if (sport) users = users.filter((p) => p.sports?.some((s: any) => s.name.toLowerCase() === sport.toLowerCase()))
    if (city) users = users.filter((p) => p.city?.toLowerCase().includes(city.toLowerCase()))
    return NextResponse.json({ data: users })
  }

  const q = searchParams.get('q')

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  let query = supabaseAdmin
    .from('profiles')
    .select('id, name, avatarUrl, bio, city, level, isCoach, email')
    .neq('id', auth.userId as number)
    .limit(20)
  if (city) query = query.ilike('city', `%${city}%`)
  if (q) query = query.ilike('name', `%${q}%`)

  const { data: rows } = await query
  const profiles = (rows ?? []).map((p: any) => ({
    id: p.id, user_id: p.id, name: p.name, avatar_url: p.avatarUrl,
    bio: p.bio, city: p.city, level: p.level?.toLowerCase(), is_coach: p.isCoach,
    sports: [],
  }))
  return NextResponse.json({ data: profiles })
}
