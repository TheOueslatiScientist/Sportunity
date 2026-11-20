import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { FRIENDSHIPS, PROFILES, getNextId } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  if (useMockData) {
    const accepted = FRIENDSHIPS.filter(
      (f) => f.status === 'accepted' && (f.requester_id === auth.userId || f.addressee_id === auth.userId)
    ).map((f) => ({ ...f, friend: f.requester_id === auth.userId ? f.addressee : f.requester }))
    const pending_received = FRIENDSHIPS.filter(
      (f) => f.status === 'pending' && f.addressee_id === auth.userId
    ).map((f) => ({ ...f, friend: f.requester }))
    const pending_sent = FRIENDSHIPS.filter(
      (f) => f.status === 'pending' && f.requester_id === auth.userId
    ).map((f) => ({ ...f, friend: f.addressee }))
    return NextResponse.json({ data: { accepted, pending_received, pending_sent } })
  }

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const userId = auth.userId as number

  const { data: rows } = await supabaseAdmin
    .from('friendships')
    .select('id, status, requesterId, addresseeId')
    .or(`requesterId.eq.${userId},addresseeId.eq.${userId}`)
    .order('createdAt', { ascending: false })

  if (!rows?.length) return NextResponse.json({ data: { accepted: [], pending_received: [], pending_sent: [] } })

  // Collect all peer IDs to fetch profiles in one query
  const peerIds = [...new Set(rows.map((f: any) => f.requesterId === userId ? f.addresseeId : f.requesterId))]
  const { data: profileRows } = await supabaseAdmin
    .from('profiles')
    .select('id, name, avatarUrl, city, isCoach')
    .in('id', peerIds)
  const profileMap = Object.fromEntries((profileRows ?? []).map((p: any) => [p.id, p]))

  const seenPeers = new Set<number>()
  const accepted = rows
    .filter((f: any) => f.status === 'ACCEPTED')
    .filter((f: any) => {
      const peerId = f.requesterId === userId ? f.addresseeId : f.requesterId
      if (seenPeers.has(peerId)) return false
      seenPeers.add(peerId)
      return true
    })
    .map((f: any) => {
      const peerId = f.requesterId === userId ? f.addresseeId : f.requesterId
      return { id: f.id, status: 'accepted', requester_id: f.requesterId, addressee_id: f.addresseeId, friend: serializeProfile(profileMap[peerId]) }
    })
  const pending_received = rows
    .filter((f: any) => f.status === 'PENDING' && f.addresseeId === userId)
    .map((f: any) => ({ id: f.id, status: 'pending', requester_id: f.requesterId, addressee_id: f.addresseeId, friend: serializeProfile(profileMap[f.requesterId]) }))
  const pending_sent = rows
    .filter((f: any) => f.status === 'PENDING' && f.requesterId === userId)
    .map((f: any) => ({ id: f.id, status: 'pending', requester_id: f.requesterId, addressee_id: f.addresseeId, friend: serializeProfile(profileMap[f.addresseeId]) }))

  return NextResponse.json({ data: { accepted, pending_received, pending_sent } })
}

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { addressee_id } = await req.json()
  if (!addressee_id) return NextResponse.json({ error: 'addressee_id requis.' }, { status: 400 })
  if (addressee_id === auth.userId) return NextResponse.json({ error: 'Vous ne pouvez pas vous ajouter vous-même.' }, { status: 400 })

  if (useMockData) {
    const existing = FRIENDSHIPS.find(
      (f) => (f.requester_id === auth.userId && f.addressee_id === addressee_id) ||
        (f.requester_id === addressee_id && f.addressee_id === auth.userId)
    )
    if (existing) return NextResponse.json({ error: 'Une demande existe déjà.', data: existing }, { status: 409 })
    const requester = PROFILES.find((p) => p.user_id === auth.userId)
    const addressee = PROFILES.find((p) => p.user_id === addressee_id)
    const friendship = {
      id: getNextId(FRIENDSHIPS), requester_id: auth.userId, addressee_id,
      status: 'pending' as const, created_at: new Date().toISOString(), requester, addressee,
    }
    FRIENDSHIPS.push(friendship)
    return NextResponse.json({ data: friendship }, { status: 201 })
  }

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { data: friendship, error } = await supabaseAdmin
    .from('friendships')
    .insert({ requesterId: auth.userId as number, addresseeId: addressee_id, status: 'PENDING' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: 'Une demande existe déjà.' }, { status: 409 })
  return NextResponse.json({ data: { ...friendship, status: 'pending' } }, { status: 201 })
}

function serializeProfile(p: any) {
  if (!p) return null
  return { id: p.id, user_id: p.id, name: p.name, avatar_url: p.avatarUrl, city: p.city, is_coach: p.isCoach }
}
