import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { data: rows } = await supabaseAdmin
    .from('notifications')
    .select('id,type,title,body,relatedId,read,createdAt')
    .eq('userId', auth.userId as number)
    .order('createdAt', { ascending: false })
    .limit(50)

  const unreadCount = (rows ?? []).filter((n: any) => !n.read).length

  return NextResponse.json({
    data: (rows ?? []).map((n: any) => ({
      id: n.id, type: n.type, title: n.title, body: n.body,
      related_id: n.relatedId, read: n.read, created_at: n.createdAt,
    })),
    unread_count: unreadCount,
  })
}

// PATCH /api/notifications — mark all as read
export async function PATCH(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  await supabaseAdmin.from('notifications').update({ read: true })
    .eq('userId', auth.userId as number).eq('read', false)

  return NextResponse.json({ success: true })
}
