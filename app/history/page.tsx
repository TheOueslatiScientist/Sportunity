'use client'
import { useState, useEffect, useCallback } from 'react'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import { getStoredUser, getAuthToken } from '@/lib/client-utils'
import { formatEventDate, cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

const SPORTS = [
  { id: 1, name: 'Football',    icon: '⚽' },
  { id: 2, name: 'Basketball',  icon: '🏀' },
  { id: 3, name: 'Tennis',      icon: '🎾' },
  { id: 4, name: 'Running',     icon: '🏃' },
  { id: 5, name: 'Natation',    icon: '🏊' },
  { id: 6, name: 'Volleyball',  icon: '🏐' },
  { id: 7, name: 'Padel',       icon: '🏓' },
  { id: 8, name: 'Gym / Fitness', icon: '💪' },
]

const PERIODS = [
  { value: 'all', label: 'Tout' },
  { value: '1m',  label: '1 mois' },
  { value: '3m',  label: '3 mois' },
  { value: '6m',  label: '6 mois' },
]

interface HistoryEvent {
  id: number
  title: string
  date: string
  sport_id: number
  score: string | null
  team_a: string | null
  team_b: string | null
  level: string | null
  role: 'creator' | 'participant'
}

export default function HistoryPage() {
  const router = useRouter()
  const [events, setEvents] = useState<HistoryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [sport, setSport] = useState<number | null>(null)
  const [period, setPeriod] = useState('all')
  const [userId, setUserId] = useState<number | null>(null)

  useEffect(() => {
    const user = getStoredUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)
  }, [router])

  const fetchHistory = useCallback(async () => {
    if (!userId) return
    const token = getAuthToken()
    if (!token) { router.push('/login'); return }
    setLoading(true)
    const params = new URLSearchParams()
    if (sport) params.set('sport', String(sport))
    if (period !== 'all') params.set('period', period)
    const qs = params.toString() ? `?${params}` : ''
    try {
      const res = await fetch(`/api/users/${userId}/events${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setEvents(data.data ?? [])
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [userId, sport, period, router])

  useEffect(() => {
    if (userId) fetchHistory()
  }, [userId, fetchHistory])

  const sportMap = Object.fromEntries(SPORTS.map((s) => [s.id, s]))

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/profile" className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-900">Mon historique</h1>
        </div>

        {/* Period filter */}
        <div className="flex gap-1 mb-3 bg-gray-100 rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn('flex-1 py-1.5 rounded-lg text-xs font-bold transition-all',
                period === p.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Sport filter chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => setSport(null)}
            className={cn('px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0',
              sport === null ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
          >
            Tous
          </button>
          {SPORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSport(sport === s.id ? null : s.id)}
              className={cn('px-3 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-1',
                sport === s.id ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
            >
              {s.icon} {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl h-28 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📅</p>
            <p className="font-bold text-gray-900 text-lg mb-2">Aucun événement passé</p>
            <p className="text-sm text-gray-500 mb-6">
              {sport || period !== 'all' ? 'Essaie de modifier les filtres.' : 'Participe à des événements pour voir ton historique ici.'}
            </p>
            <Link href="/events" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white text-sm font-bold rounded-2xl active:scale-95 transition-transform">
              Voir les événements
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Count */}
            <p className="text-xs font-semibold text-gray-400 px-1">
              {events.length} événement{events.length > 1 ? 's' : ''}
            </p>

            {events.map((event) => {
              const s = sportMap[event.sport_id]
              const dateStr = formatEventDate(event.date)
              const [scoreA, scoreB] = event.score ? event.score.split(' - ') : [null, null]

              return (
                <div key={event.id} className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden">
                  <div className="p-4">
                    {/* Top row: sport icon + title + role badge */}
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-primary-50 flex items-center justify-center text-2xl flex-shrink-0">
                        {s?.icon ?? '🏅'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 flex-1">
                            {event.title}
                          </h3>
                          <span className={cn('flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full',
                            event.role === 'creator' ? 'bg-purple-100 text-purple-600' : 'bg-primary-50 text-primary-600')}>
                            {event.role === 'creator' ? 'Organisateur' : 'Participant'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">{s?.name}</span>
                          <span className="text-gray-200">·</span>
                          <span className="text-xs text-gray-400">{dateStr}</span>
                        </div>
                      </div>
                    </div>

                    {/* Score block */}
                    {event.score && scoreA != null && scoreB != null ? (
                      <div className="mt-3 flex items-center justify-center gap-3 py-2.5 bg-gray-50 rounded-2xl">
                        <div className="flex flex-col items-center gap-0.5 flex-1">
                          <span className="text-[10px] font-semibold text-gray-400 truncate max-w-[80px]">
                            {event.team_a || 'Équipe A'}
                          </span>
                          <span className="text-2xl font-extrabold text-gray-900">{scoreA}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-300">-</span>
                        <div className="flex flex-col items-center gap-0.5 flex-1">
                          <span className="text-[10px] font-semibold text-gray-400 truncate max-w-[80px]">
                            {event.team_b || 'Équipe B'}
                          </span>
                          <span className="text-2xl font-extrabold text-gray-900">{scoreB}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-300">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Score non renseigné
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
