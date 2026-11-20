'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthToken } from '@/lib/client-utils'
import { cn } from '@/lib/utils'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

type Notif = { id: number; type: string; title: string; body?: string; related_id?: number; read: boolean; created_at: string }

const TYPE_ICONS: Record<string, string> = {
  match_joined: '🏃',
  match_full: '🔥',
  new_message: '💬',
  match_comment: '💬',
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'à l\'instant'
  if (diff < 3600) return `${Math.floor(diff / 60)} min`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function notifHref(notif: Notif): string | null {
  if (!notif.related_id) return null
  if (notif.type === 'match_joined' || notif.type === 'match_full') return `/matches/${notif.related_id}`
  if (notif.type === 'new_message') return '/chat'
  return null
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getAuthToken()
    if (!token) { router.push('/login'); return }
    fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setNotifs(d.data ?? []); setLoading(false) })
    // Mark all as read after 1s
    setTimeout(() => {
      fetch('/api/notifications', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
    }, 1000)
  }, [router])

  const unread = notifs.filter((n) => !n.read).length

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-gray-900">Notifications</h1>
          {unread > 0 && (
            <span className="text-xs font-bold bg-primary-500 text-white px-2.5 py-1 rounded-full">
              {unread} nouvelle{unread > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-2">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && notifs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-5xl">🔔</span>
            <p className="font-bold text-gray-700">Aucune notification</p>
            <p className="text-sm text-gray-400 text-center">Tu seras notifié quand quelqu'un rejoindra tes matchs ou t'enverra un message.</p>
          </div>
        )}

        {notifs.map((notif) => {
          const href = notifHref(notif)
          const content = (
            <div className={cn(
              'flex items-start gap-3 bg-white rounded-2xl p-4 border transition-all',
              notif.read ? 'border-gray-100' : 'border-primary-200 bg-primary-50/30'
            )}>
              <div className={cn(
                'w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg',
                notif.read ? 'bg-gray-100' : 'bg-primary-100'
              )}>
                {TYPE_ICONS[notif.type] ?? '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn('text-sm leading-snug', notif.read ? 'text-gray-700' : 'font-semibold text-gray-900')}>
                    {notif.title}
                  </p>
                  <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">{timeAgo(notif.created_at)}</span>
                </div>
                {notif.body && <p className="text-xs text-gray-400 mt-0.5 truncate">{notif.body}</p>}
              </div>
              {!notif.read && (
                <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
              )}
            </div>
          )

          return href ? (
            <Link key={notif.id} href={href}>{content}</Link>
          ) : (
            <div key={notif.id}>{content}</div>
          )
        })}
      </div>

      <BottomNav />
    </div>
  )
}
