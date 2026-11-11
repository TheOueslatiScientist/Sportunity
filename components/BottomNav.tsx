'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { getAuthToken } from '@/lib/client-utils'

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [unread, setUnread] = useState(0)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    const token = getAuthToken()
    if (!token) return
    fetch('/api/messages/unread', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setUnread(d.count ?? 0))
      .catch(() => {})
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
      href: '/map', label: 'Explorer',
      icon: (a: boolean) => (
        <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
  ]

  const right = [
    {
      href: '/events', label: 'Événements',
      icon: (a: boolean) => (
        <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      href: '/chat', label: 'Messages', badge: unread,
      icon: (a: boolean) => (
        <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
  ]

  const createOptions = [
    { label: 'Publier', href: '/feed?compose=1' },
    { label: 'Événement', href: '/events/new' },
    { label: 'Match', href: '/matches/new' },
  ]

  function NavItem({ href, label, icon, badge }: { href: string; label: string; icon: (a: boolean) => React.ReactNode; badge?: number }) {
    const active = pathname === href || (href !== '/feed' && pathname.startsWith(href + '/'))
    return (
      <Link href={href} className="flex flex-col items-center gap-0.5 flex-1 py-2 relative">
        <div className={cn('relative', active ? 'text-primary-700' : 'text-gray-400')}>
          {icon(active)}
          {(badge ?? 0) > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
              {badge! > 9 ? '9+' : badge}
            </span>
          )}
        </div>
        <span className={cn('text-[9px] font-semibold', active ? 'text-primary-700' : 'text-gray-400')}>
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
