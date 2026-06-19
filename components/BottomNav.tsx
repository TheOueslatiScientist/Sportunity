'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { getAuthToken } from '@/lib/client-utils'

interface NavItem {
  href: string
  label: string
  badge?: number
  matchPaths?: string[]
  icon: (active: boolean) => React.ReactNode
}

export default function BottomNav() {
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const token = getAuthToken()
    if (!token) return
    fetch('/api/messages/unread', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setUnread(d.count ?? 0))
      .catch(() => {})
  }, [pathname])

  const NAV_ITEMS: NavItem[] = [
    {
      href: '/feed',
      label: 'Accueil',
      icon: (active) => (
        <svg className={cn('w-5 h-5', active ? 'text-primary-500' : 'text-gray-400')} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: '/matches',
      label: 'Sport',
      matchPaths: ['/matches', '/tournaments', '/competitions'],
      icon: (active) => (
        <svg className={cn('w-5 h-5', active ? 'text-primary-500' : 'text-gray-400')} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: '/map',
      label: 'Carte',
      icon: (active) => (
        <svg className={cn('w-5 h-5', active ? 'text-primary-500' : 'text-gray-400')} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
    {
      href: '/expert',
      label: 'Conseils',
      icon: (active) => (
        <svg className={cn('w-5 h-5', active ? 'text-primary-500' : 'text-gray-400')} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      href: '/coaches',
      label: 'Coachs',
      icon: (active) => (
        <svg className={cn('w-5 h-5', active ? 'text-primary-500' : 'text-gray-400')} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      href: '/chat',
      label: 'Messages',
      badge: unread,
      icon: (active) => (
        <svg className={cn('w-5 h-5', active ? 'text-primary-500' : 'text-gray-400')} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      href: '/profile',
      label: 'Profil',
      icon: (active) => (
        <svg className={cn('w-5 h-5', active ? 'text-primary-500' : 'text-gray-400')} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-bottom-nav" style={{ zIndex: 1000 }}>
      <div className="flex items-center justify-around px-0.5 py-1 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const extraPaths = item.matchPaths ?? []
          const active =
            pathname === item.href ||
            (item.href !== '/feed' && pathname.startsWith(item.href + '/')) ||
            extraPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))
          const hasBadge = 'badge' in item && (item.badge ?? 0) > 0
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-2xl transition-all duration-200 min-w-0 relative',
                active ? 'text-primary-500' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <div className="relative">
                {item.icon(active)}
                {hasBadge && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white">{(item.badge ?? 0) > 9 ? '9+' : item.badge}</span>
                  </div>
                )}
              </div>
              <span className={cn('text-[9px] font-semibold truncate max-w-[44px] text-center leading-tight', active ? 'text-primary-500' : 'text-gray-400')}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
