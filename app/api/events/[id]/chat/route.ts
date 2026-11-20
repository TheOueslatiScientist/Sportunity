import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

async function checkAccess(supabaseAdmin: any, eventId: number, userId: number) {
  const { data: event } = await supabaseAdmin.from('sport_events').select('creatorId').eq('id', eventId).single()
  if (!event) return null
  if (event.creatorId === userId) return event
  const { data: participant } = await supabaseAdmin.from('event_participants')
    .select('status').eq('eventId', eventId).eq('profileId', userId).maybeSingle()
  if (!participant || participant.status !== 'ACCEPTED') return null
  return event
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const eventId = parseInt(id)

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const access = await checkAccess(supabaseAdmin, eventId, auth.userId as number)
  if (!access) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const { data: messages } = await supabaseAdmin
    .from('event_messages')
    .select('id, senderId, content, createdAt')
    .eq('eventId', eventId)
    .order('createdAt', { ascending: true })
    .limit(100)

  if (!messages?.length) return NextResponse.json({ data: [] })

  const senderIds = [...new Set(messages.map((m: any) => m.senderId))]
  const { data: profiles } = await supabaseAdmin.from('profiles').select('id, name, avatarUrl').in('id', senderIds)
  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]))

  return NextResponse.json({
    data: messages.map((m: any) => ({
      id: m.id, sender_id: m.senderId, content: m.content, created_at: m.createdAt,
      sender: profileMap[m.senderId] ? { id: profileMap[m.senderId].id, name: profileMap[m.senderId].name, avatar_url: profileMap[m.senderId].avatarUrl } : null,
    })),
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const eventId = parseInt(id)
  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Contenu requis.' }, { status: 400 })

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const access = await checkAccess(supabaseAdmin, eventId, auth.userId as number)
  if (!access) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const { data: msg, error } = await supabaseAdmin
    .from('event_messages')
    .insert({ eventId, senderId: auth.userId as number, content: content.trim() })
    .select().single()
  if (error) return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })

  return NextResponse.json({ data: { id: msg.id, sender_id: msg.senderId, content: msg.content, created_at: msg.createdAt } }, { status: 201 })
}
