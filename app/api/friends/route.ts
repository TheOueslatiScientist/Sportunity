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

  const { prisma } = await import('@/lib/prisma')
  const userId = auth.userId as number

  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
    include: { requester: true, addressee: true },
    orderBy: { createdAt: 'desc' },
  })

  const accepted = friendships
    .filter((f) => f.status === 'ACCEPTED')
    .map((f) => ({
      id: f.id, status: f.status.toLowerCase(),
      friend: f.requesterId === userId ? serializeProfile(f.addressee) : serializeProfile(f.requester),
    }))

  const pending_received = friendships
    .filter((f) => f.status === 'PENDING' && f.addresseeId === userId)
    .map((f) => ({ id: f.id, status: f.status.toLowerCase(), friend: serializeProfile(f.requester) }))

  const pending_sent = friendships
    .filter((f) => f.status === 'PENDING' && f.requesterId === userId)
    .map((f) => ({ id: f.id, status: f.status.toLowerCase(), friend: serializeProfile(f.addressee) }))

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

  const { prisma } = await import('@/lib/prisma')
  try {
    const friendship = await prisma.friendship.create({
      data: { requesterId: auth.userId as number, addresseeId: addressee_id, status: 'PENDING' },
    })
    return NextResponse.json({ data: friendship }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Une demande existe déjà.' }, { status: 409 })
  }
}

function serializeProfile(p: any) {
  return { id: p.id, user_id: p.id, name: p.name, avatar_url: p.avatarUrl, city: p.city, is_coach: p.isCoach }
}
