'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { getStoredUser, getAuthToken } from '@/lib/client-utils'

export default function BottomNav() {
  const pathname = usePathname()
  const [showCreate, setShowCreate] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const user = getStoredUser()
    if (user) {
      setAvatarUrl(`https://api.dicebear.com/8.x/avataaars/svg?seed=${user.name ?? user.email}`)
    } else {
      setAvatarUrl(null)
    }
  }, [pathname])

  // Poll unread notifications count every 30s
  useEffect(() => {
    function fetchCount() {
      const token = getAuthToken()
      if (!token) return
      fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d) setUnreadCount(d.unread_count ?? 0) })
        .catch(() => {})
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Reset badge when visiting notifications page
  useEffect(() => {
    if (pathname === '/notifications') setUnreadCount(0)
  }, [pathname])

  const left = [
    {
      href: '/feed', label: 'Accueil',
      icon: (a: boolean) => (
        <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: '/events', label: 'Événements',
      icon: (a: boolean) => (
        <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ]

  const right = [
    {
      href: '/chat', label: 'Messages',
      icon: (a: boolean) => (
        <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      href: '/notifications', label: 'Alertes',
      badge: unreadCount,
      icon: (a: boolean) => (
        <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
      ),
    },
    {
      href: '/profile', label: 'Profil',
      icon: (a: boolean) => (
        <div className={cn('w-6 h-6 rounded-full overflow-hidden border-2 bg-gray-100 flex-shrink-0', a ? 'border-primary-700' : 'border-gray-300')}>
          {avatarUrl
            ? <img src={avatarUrl} alt="profil" className="w-full h-full object-cover" />
            : <svg className="w-full h-full text-gray-400 p-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
          }
        </div>
      ),
    },
  ]

  const createOptions = [
    { label: 'Publier', href: '/feed?compose=1' },
    { label: 'Événement', href: '/events/new' },
    { label: 'Match', href: '/matches/new' },
    { label: 'Carte', href: '/map' },
  ]

  function NavItem({ href, label, icon, badge }: { href: string; label: string; icon: (a: boolean) => React.ReactNode; badge?: number }) {
    const active = pathname === href || (href !== '/feed' && pathname.startsWith(href + '/'))
    return (
      <Link
        href={href}
        prefetch={true}
        className="flex flex-col items-center gap-0.5 flex-1 py-2 relative active:scale-95 transition-transform duration-100"
      >
        <div className={cn('relative transition-colors duration-200', active ? 'text-primary-700' : 'text-gray-400')}>
          {icon(active)}
          {(badge ?? 0) > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
              {badge! > 9 ? '9+' : badge}
            </span>
          )}
        </div>
        <span className={cn('text-[9px] font-semibold transition-colors duration-200', active ? 'text-primary-700' : 'text-gray-400')}>
          {label}
        </span>
      </Link>
    )
  }

  return (
    <>
      {showCreate && (
        <>
          <div className="fixed inset-0 bg-black/30" style={{ zIndex: 1050 }} onClick={() => setShowCreate(false)} />
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 flex flex-col gap-1 min-w-[180px]" style={{ zIndex: 1060 }}>
            {createOptions.map((o) => (
              <Link key={o.href} href={o.href} onClick={() => setShowCreate(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-800">
                {o.label}
              </Link>
            ))}
          </div>
        </>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100" style={{ zIndex: 1000 }}>
        <div className="flex items-center max-w-lg mx-auto">
          {left.map((item) => <NavItem key={item.href} {...item} />)}

          {/* Centre + */}
          <div className="flex flex-col items-center gap-0.5 flex-1 py-1.5">
            <button
              onClick={() => setShowCreate((v) => !v)}
              className="w-12 h-12 rounded-full bg-primary-700 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {right.map((item) => <NavItem key={item.href} {...item} />)}
        </div>
      </nav>
    </>
  )
}
