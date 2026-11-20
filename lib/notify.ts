// Server-side only — called from API routes
export type NotifType = 'match_joined' | 'match_full' | 'new_message' | 'match_comment'

export async function createNotification({
  userId, type, title, body, relatedId,
}: { userId: number; type: NotifType; title: string; body?: string; relatedId?: number }) {
  try {
    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    await supabaseAdmin.from('notifications').insert({ userId, type, title, body: body ?? null, relatedId: relatedId ?? null })
  } catch (err) {
    console.error('[notify]', err)
  }
}

export async function createNotifications(notifs: Parameters<typeof createNotification>[0][]) {
  if (!notifs.length) return
  try {
    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    await supabaseAdmin.from('notifications').insert(notifs.map((n) => ({
      userId: n.userId, type: n.type, title: n.title, body: n.body ?? null, relatedId: n.relatedId ?? null,
    })))
  } catch (err) {
    console.error('[notify bulk]', err)
  }
}
