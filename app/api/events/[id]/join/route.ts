import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { EVENTS, PROFILES } from '@/lib/mock-data'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const eventId = parseInt(id)

  if (useMockData) {
    const event = EVENTS.find((e) => e.id === eventId)
    if (!event) return NextResponse.json({ error: 'Événement introuvable.' }, { status: 404 })
    const alreadyJoined = event.participants?.some((p: any) => p.user_id === auth.userId)
    if (alreadyJoined) return NextResponse.json({ error: 'Vous participez déjà à cet événement.' }, { status: 409 })
    if ((event.participants_count ?? 0) >= event.max_participants)
      return NextResponse.json({ error: "L'événement est complet." }, { status: 409 })
    const profile = PROFILES.find((p) => p.user_id === auth.userId)
    if (profile) {
      event.participants = [...(event.participants ?? []), profile]
      event.participants_count = (event.participants_count ?? 0) + 1
    }
    return NextResponse.json({ data: event })
  }

  const { supabaseAdmin } = await import('@/lib/supabase-admin')

  const { data: event } = await supabaseAdmin
    .from('sport_events')
    .select('id, maxParticipants, title, creatorId')
    .eq('id', eventId)
    .single()
  if (!event) return NextResponse.json({ error: 'Événement introuvable.' }, { status: 404 })

  const { data: existing } = await supabaseAdmin
    .from('event_participants')
    .select('eventId')
    .eq('eventId', eventId)
    .eq('profileId', auth.userId as number)
    .maybeSingle()
  if (existing) return NextResponse.json({ error: 'Vous participez déjà à cet événement.' }, { status: 409 })

  const { count } = await supabaseAdmin
    .from('event_participants')
    .select('*', { count: 'exact', head: true })
    .eq('eventId', eventId)
  if ((count ?? 0) >= event.maxParticipants)
    return NextResponse.json({ error: "L'événement est complet." }, { status: 409 })

  const { error } = await supabaseAdmin
    .from('event_participants')
    .insert({ eventId, profileId: auth.userId as number, status: 'PENDING' })
  if (error) {
    console.error('[POST join event]', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }

  // Notify creator of the new request
  const { data: requester } = await supabaseAdmin.from('profiles').select('name').eq('id', auth.userId as number).single()
  const { createNotification } = await import('@/lib/notify')
  await createNotification({
    userId: event.creatorId as number, type: 'event_request',
    title: `${requester?.name ?? 'Quelqu\'un'} veut rejoindre ton event`,
    body: event.title, relatedId: eventId,
  })

  return NextResponse.json({ message: 'Demande envoyée !', status: 'PENDING' })
}
