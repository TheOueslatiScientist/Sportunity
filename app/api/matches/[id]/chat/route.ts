import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'

const MOCK_CHAT: any[] = []

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const matchId = parseInt(id)

  if (useMockData) {
    return NextResponse.json({ data: MOCK_CHAT.filter((m) => m.match_id === matchId) })
  }

  const { supabaseAdmin } = await import('@/lib/supabase-admin')

  // Check participant
  const { data: participant } = await supabaseAdmin
    .from('match_participants').select('profileId')
    .eq('matchId', matchId).eq('profileId', auth.userId as number).maybeSingle()
  const { data: match } = await supabaseAdmin.from('matches').select('creatorId').eq('id', matchId).single()

  if (!participant && match?.creatorId !== (auth.userId as number))
    return NextResponse.json({ error: 'Réservé aux participants.' }, { status: 403 })

  const { data: rows } = await supabaseAdmin
    .from('match_messages')
    .select('id,matchId,senderId,content,createdAt')
    .eq('matchId', matchId)
    .order('createdAt', { ascending: true })

  if (!rows?.length) return NextResponse.json({ data: [] })

  const senderIds = [...new Set(rows.map((m: any) => m.senderId))]
  const { data: profiles } = await supabaseAdmin.from('profiles').select('id,name,avatarUrl').in('id', senderIds)
  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]))

  return NextResponse.json({
    data: rows.map((m: any) => ({
      id: m.id, match_id: m.matchId, sender_id: m.senderId,
      sender: profileMap[m.senderId] ? { id: profileMap[m.senderId].id, name: profileMap[m.senderId].name, avatar_url: profileMap[m.senderId].avatarUrl } : null,
      content: m.content, created_at: m.createdAt,
    }))
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const matchId = parseInt(id)
  const { content } = await req.json()

  if (!content?.trim())
    return NextResponse.json({ error: 'Message vide.' }, { status: 400 })

  if (useMockData) {
    const msg = { id: MOCK_CHAT.length + 1, match_id: matchId, sender_id: auth.userId, content: content.trim(), created_at: new Date().toISOString() }
    MOCK_CHAT.push(msg)
    return NextResponse.json({ data: msg }, { status: 201 })
  }

  const { supabaseAdmin } = await import('@/lib/supabase-admin')

  const { data: participant } = await supabaseAdmin.from('match_participants')
    .select('profileId').eq('matchId', matchId).eq('profileId', auth.userId as number).maybeSingle()
  const { data: match } = await supabaseAdmin.from('matches').select('creatorId').eq('id', matchId).single()

  if (!participant && match?.creatorId !== (auth.userId as number))
    return NextResponse.json({ error: 'Réservé aux participants.' }, { status: 403 })

  const { data: msg, error } = await supabaseAdmin
    .from('match_messages')
    .insert({ matchId, senderId: auth.userId as number, content: content.trim() })
    .select('id,matchId,senderId,content,createdAt')
    .single()

  if (error) {
    console.error('[POST /api/matches/[id]/chat]', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }

  const { data: sender } = await supabaseAdmin.from('profiles').select('id,name,avatarUrl').eq('id', auth.userId as number).single()

  return NextResponse.json({
    data: {
      id: msg.id, match_id: msg.matchId, sender_id: msg.senderId,
      sender: sender ? { id: sender.id, name: sender.name, avatar_url: sender.avatarUrl } : null,
      content: msg.content, created_at: msg.createdAt,
    }
  }, { status: 201 })
}
