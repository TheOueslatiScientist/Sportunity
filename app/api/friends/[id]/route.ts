import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { FRIENDSHIPS } from '@/lib/mock-data'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const friendshipId = parseInt(id)
  const { action } = await req.json()

  if (useMockData) {
    const f = FRIENDSHIPS.find((x) => x.id === friendshipId && x.addressee_id === auth.userId)
    if (!f) return NextResponse.json({ error: 'Demande introuvable.' }, { status: 404 })
    f.status = action === 'accept' ? 'accepted' : 'rejected'
    return NextResponse.json({ data: f })
  }

  const { prisma } = await import('@/lib/prisma')
  const updated = await prisma.friendship.updateMany({
    where: { id: friendshipId, addresseeId: auth.userId as number },
    data: { status: action === 'accept' ? 'ACCEPTED' : 'REJECTED' },
  })
  if (updated.count === 0) return NextResponse.json({ error: 'Demande introuvable.' }, { status: 404 })
  return NextResponse.json({ data: { id: friendshipId, status: action === 'accept' ? 'accepted' : 'rejected' } })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const friendshipId = parseInt(id)

  if (useMockData) {
    const idx = FRIENDSHIPS.findIndex(
      (f) => f.id === friendshipId && (f.requester_id === auth.userId || f.addressee_id === auth.userId)
    )
    if (idx === -1) return NextResponse.json({ error: 'Amitié introuvable.' }, { status: 404 })
    FRIENDSHIPS.splice(idx, 1)
    return NextResponse.json({ message: 'Amitié supprimée.' })
  }

  const { prisma } = await import('@/lib/prisma')
  const userId = auth.userId as number
  await prisma.friendship.deleteMany({
    where: { id: friendshipId, OR: [{ requesterId: userId }, { addresseeId: userId }] },
  })
  return NextResponse.json({ message: 'Amitié supprimée.' })
}
