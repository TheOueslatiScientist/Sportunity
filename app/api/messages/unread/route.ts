import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { MESSAGES } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ count: 0 })

  if (useMockData) {
    const count = MESSAGES.filter((m) => m.receiver_id === auth.userId && !m.read).length
    return NextResponse.json({ count })
  }

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { count } = await supabaseAdmin
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiverId', auth.userId as number)
    .eq('read', false)

  return NextResponse.json({ count: count ?? 0 })
}
