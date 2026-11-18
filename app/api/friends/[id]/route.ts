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

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const newStatus = action === 'accept' ? 'ACCEPTED' : 'REJECTED'
  const { data, error } = await supabaseAdmin
    .from('friendships')
    .update({ status: newStatus })
    .eq('id', friendshipId)
    .eq('addresseeId', auth.userId as number)
    .select()
  if (error || !data?.length) return NextResponse.json({ error: 'Demande introuvable.' }, { status: 404 })
  return NextResponse.json({ data: { id: friendshipId, status: newStatus.toLowerCase() } })
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

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const userId = auth.userId as number
  await supabaseAdmin
    .from('friendships')
    .delete()
    .eq('id', friendshipId)
    .or(`requesterId.eq.${userId},addresseeId.eq.${userId}`)
  return NextResponse.json({ message: 'Amitié supprimée.' })
}
