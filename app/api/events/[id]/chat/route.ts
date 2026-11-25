import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const eventId = parseInt(id)
  if (isNaN(eventId)) return NextResponse.json({ error: 'ID invalide.' }, { status: 400 })

  const { supabaseAdmin } = await import('@/lib/supabase-admin')

  // Check user is participant or creator
  const { data: event } = await supabaseAdmin
    .from('sport_events')
    .select('id, title, creatorId')
    .eq('id', eventId)
    .single()
  if (!event) return NextResponse.json({ error: 'Événement introuvable.' }, { status: 404 })

  const isCreator = event.creatorId === auth.userId
  if (!isCreator) {
    const { data: part } = await supabaseAdmin
      .from('event_participants')
      .select('status')
      .eq('eventId', eventId)
      .eq('profileId', auth.userId as number)
      .maybeSingle()
    if (!part || part.status !== 'ACCEPTED')
      return NextResponse.json({ error: 'Réservé aux participants acceptés.' }, { status: 403 })
  }

  const { data: rows } = await supabaseAdmin
    .from('event_messages')
    .select('id, senderId, content, createdAt')
    .eq('eventId', eventId)
    .order('createdAt', { ascending: true })
    .limit(200)

  if (!rows?.length) return NextResponse.json({ data: [], event: { id: event.id, title: event.title } })

  const senderIds = [...new Set(rows.map((r: any) => r.senderId))]
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, name, avatarUrl')
    .in('id', senderIds)
  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]))

  return NextResponse.json({
    data: rows.map((r: any) => ({
      id: r.id,
      sender_id: r.senderId,
      content: r.content,
      created_at: r.createdAt,
      sender: profileMap[r.senderId] ? {
        id: profileMap[r.senderId].id,
        name: profileMap[r.senderId].name,
        avatar_url: profileMap[r.senderId].avatarUrl,
      } : null,
    })),
    event: { id: event.id, title: event.title },
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const eventId = parseInt(id)
  if (isNaN(eventId)) return NextResponse.json({ error: 'ID invalide.' }, { status: 400 })

  const { supabaseAdmin } = await import('@/lib/supabase-admin')

  const { data: event } = await supabaseAdmin
    .from('sport_events')
    .select('creatorId')
    .eq('id', eventId)
    .single()
  if (!event) return NextResponse.json({ error: 'Événement introuvable.' }, { status: 404 })

  const isCreator = event.creatorId === auth.userId
  if (!isCreator) {
    const { data: part } = await supabaseAdmin
      .from('event_participants')
      .select('status')
      .eq('eventId', eventId)
      .eq('profileId', auth.userId as number)
      .maybeSingle()
    if (!part || part.status !== 'ACCEPTED')
      return NextResponse.json({ error: 'Réservé aux participants acceptés.' }, { status: 403 })
  }

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Message vide.' }, { status: 400 })

  const { data: msg, error } = await supabaseAdmin
    .from('event_messages')
    .insert({ eventId, senderId: auth.userId as number, content: content.trim() })
    .select('id, senderId, content, createdAt')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: { id: msg.id, sender_id: msg.senderId, content: msg.content, created_at: msg.createdAt },
  }, { status: 201 })
}
