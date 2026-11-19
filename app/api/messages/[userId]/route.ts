import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { MESSAGES } from '@/lib/mock-data'

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { userId } = await params
  const otherId = parseInt(userId)

  if (useMockData) {
    const conversation = MESSAGES.filter(
      (m) =>
        (m.sender_id === auth.userId && m.receiver_id === otherId) ||
        (m.sender_id === otherId && m.receiver_id === auth.userId)
    ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    return NextResponse.json({ data: conversation })
  }

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const myId = auth.userId as number

  const { data: messages } = await supabaseAdmin
    .from('messages')
    .select('*')
    .or(`and(senderId.eq.${myId},receiverId.eq.${otherId}),and(senderId.eq.${otherId},receiverId.eq.${myId})`)
    .order('createdAt', { ascending: true })

  // Mark received messages as read
  await supabaseAdmin
    .from('messages')
    .update({ read: true })
    .eq('senderId', otherId)
    .eq('receiverId', myId)
    .eq('read', false)

  const data = (messages ?? []).map((m: any) => ({
    id: m.id, sender_id: m.senderId, receiver_id: m.receiverId,
    content: m.content, read: m.read, created_at: m.createdAt,
  }))

  return NextResponse.json({ data })
}
