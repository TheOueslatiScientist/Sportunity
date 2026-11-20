import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/events/[id]/requests — creator sees pending requests
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const eventId = parseInt(id)

  const { supabaseAdmin } = await import('@/lib/supabase-admin')

  const { data: event } = await supabaseAdmin.from('sport_events').select('creatorId').eq('id', eventId).single()
  if (!event) return NextResponse.json({ error: 'Événement introuvable.' }, { status: 404 })
  if (event.creatorId !== (auth.userId as number))
    return NextResponse.json({ error: 'Réservé au créateur.' }, { status: 403 })

  const { data: rows } = await supabaseAdmin
    .from('event_participants')
    .select('profileId, status, createdAt')
    .eq('eventId', eventId)
    .order('createdAt', { ascending: true })

  if (!rows?.length) return NextResponse.json({ data: [] })

  const profileIds = rows.map((r: any) => r.profileId)
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, name, avatarUrl, city, level')
    .in('id', profileIds)
  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]))

  return NextResponse.json({
    data: rows.map((r: any) => ({
      profile_id: r.profileId,
      status: r.status,
      created_at: r.createdAt,
      profile: profileMap[r.profileId] ? {
        id: profileMap[r.profileId].id,
        name: profileMap[r.profileId].name,
        avatar_url: profileMap[r.profileId].avatarUrl,
        city: profileMap[r.profileId].city,
        level: profileMap[r.profileId].level?.toLowerCase(),
      } : null,
    })),
  })
}

// PATCH /api/events/[id]/requests — creator accepts or rejects
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const eventId = parseInt(id)
  const { profile_id, action } = await req.json()

  if (!profile_id || !['accept', 'reject'].includes(action))
    return NextResponse.json({ error: 'profile_id et action (accept|reject) requis.' }, { status: 400 })

  const { supabaseAdmin } = await import('@/lib/supabase-admin')

  const { data: event } = await supabaseAdmin.from('sport_events').select('creatorId, title').eq('id', eventId).single()
  if (!event) return NextResponse.json({ error: 'Événement introuvable.' }, { status: 404 })
  if (event.creatorId !== (auth.userId as number))
    return NextResponse.json({ error: 'Réservé au créateur.' }, { status: 403 })

  if (action === 'reject') {
    await supabaseAdmin.from('event_participants').delete().eq('eventId', eventId).eq('profileId', profile_id)
    return NextResponse.json({ success: true, action: 'rejected' })
  }

  // Accept
  await supabaseAdmin.from('event_participants')
    .update({ status: 'ACCEPTED' })
    .eq('eventId', eventId).eq('profileId', profile_id)

  // Notify accepted participant
  const { createNotification } = await import('@/lib/notify')
  await createNotification({
    userId: profile_id, type: 'event_accepted',
    title: `Tu as été accepté dans l'event`,
    body: event.title, relatedId: eventId,
  })

  return NextResponse.json({ success: true, action: 'accepted' })
}
