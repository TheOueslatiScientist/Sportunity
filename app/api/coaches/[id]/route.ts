import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { COACHES } from '@/lib/mock-data'

function serializeProfile(p: any) {
  return { id: p.id, user_id: p.id, name: p.name, avatar_url: p.avatarUrl, city: p.city, bio: p.bio }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const coachId = parseInt(id)

  if (useMockData) {
    const coach = COACHES.find((c) => c.id === coachId)
    if (!coach) return NextResponse.json({ error: 'Coach introuvable.' }, { status: 404 })
    return NextResponse.json({ data: coach })
  }

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { data: coach } = await supabaseAdmin
    .from('coaches')
    .select('id,profileId,sportId,hourlyRate,description,experienceYears,rating,reviewsCount,certifications,specialties,city,lat,lng,languages,availabilityText,isAvailableNow,isCertified,isPopular,clientsCount,sessionsCount')
    .eq('id', coachId)
    .single()
  if (!coach) return NextResponse.json({ error: 'Coach introuvable.' }, { status: 404 })

  const { data: profile } = await supabaseAdmin.from('profiles').select('id,name,avatarUrl,city,bio').eq('id', coach.profileId).single()

  return NextResponse.json({
    data: {
      id: coach.id, user_id: coach.profileId, profile: profile ? serializeProfile(profile) : null,
      sport_id: coach.sportId, hourly_rate: coach.hourlyRate, description: coach.description,
      experience_years: coach.experienceYears, rating: coach.rating, reviews_count: coach.reviewsCount,
      certifications: coach.certifications ?? [], specialties: coach.specialties ?? [],
      city: coach.city, lat: coach.lat, lng: coach.lng, languages: coach.languages ?? ['Français'],
      availability_text: coach.availabilityText, is_available_now: coach.isAvailableNow,
      is_certified: coach.isCertified, is_popular: coach.isPopular,
      clients_count: coach.clientsCount, sessions_count: coach.sessionsCount,
    },
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const coachId = parseInt(id)
  const body = await req.json()

  if (useMockData) {
    const idx = COACHES.findIndex((c) => c.id === coachId)
    if (idx === -1) return NextResponse.json({ error: 'Coach introuvable.' }, { status: 404 })
    if (COACHES[idx].user_id !== auth.userId) return NextResponse.json({ error: 'Interdit.' }, { status: 403 })
    COACHES[idx] = { ...COACHES[idx], ...body }
    return NextResponse.json({ data: COACHES[idx] })
  }

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { data: existing } = await supabaseAdmin.from('coaches').select('profileId').eq('id', coachId).single()
  if (!existing) return NextResponse.json({ error: 'Coach introuvable.' }, { status: 404 })
  if (existing.profileId !== (auth.userId as number)) return NextResponse.json({ error: 'Interdit.' }, { status: 403 })

  const data: Record<string, unknown> = {}
  if (body.sport_id !== undefined) data.sportId = body.sport_id
  if (body.hourly_rate !== undefined) data.hourlyRate = parseFloat(body.hourly_rate)
  if (body.description !== undefined) data.description = body.description
  if (body.experience_years !== undefined) data.experienceYears = parseInt(body.experience_years)
  if (body.certifications !== undefined) data.certifications = body.certifications
  if (body.specialties !== undefined) data.specialties = body.specialties
  if (body.city !== undefined) data.city = body.city
  if (body.availability_text !== undefined) data.availabilityText = body.availability_text
  if (body.is_available_now !== undefined) data.isAvailableNow = body.is_available_now

  const { data: updated } = await supabaseAdmin.from('coaches').update(data).eq('id', coachId).select().single()
  return NextResponse.json({ data: updated })
}
