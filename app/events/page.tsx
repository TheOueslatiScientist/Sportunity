'use client'
import { useState, useEffect } from 'react'
import { SportEvent } from '@/types'
import EventCard from '@/components/cards/EventCard'
import BottomNav from '@/components/BottomNav'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { getStoredUser, getAuthToken } from '@/lib/client-utils'

const LEVEL_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
]

const SPORT_FILTERS = [
  { value: 'all', label: 'Tous', icon: '🏅' },
  { value: '1', label: 'Football', icon: '⚽' },
  { value: '2', label: 'Basketball', icon: '🏀' },
  { value: '3', label: 'Tennis', icon: '🎾' },
  { value: '4', label: 'Running', icon: '🏃' },
  { value: '5', label: 'Natation', icon: '🏊' },
  { value: '6', label: 'Cyclisme', icon: '🚴' },
  { value: '7', label: 'Volley', icon: '🏐' },
  { value: '8', label: 'Badminton', icon: '🏸' },
]

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [joiningId, setJoiningId] = useState<number | null>(null)
  const [leavingId, setLeavingId] = useState<number | null>(null)
  const [level, setLevel] = useState('all')
  const [sport, setSport] = useState('all')
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [currentUserId, setCurrentUserId] = useState<number | undefined>()
  const [requests, setRequests] = useState<Record<number, any[]>>({})

  useEffect(() => {
    const user = getStoredUser()
    if (user) setCurrentUserId(user.id)
  }, [])

  useEffect(() => {
    const token = getAuthToken()
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
    const params = new URLSearchParams()
    if (level !== 'all') params.set('level', level)
    if (sport !== 'all') params.set('sport', sport)
    if (tab === 'past') params.set('past', 'true')
    const qs = params.toString() ? `?${params}` : ''
    setLoading(true)
    fetch(`/api/events${qs}`, { headers })
      .then((r) => r.json())
      .then(async (data: { data?: any[] }) => {
        const evs = data.data ?? []
        setEvents(evs)
        setLoading(false)
        // Load pending requests for upcoming events the user created
        if (!token || tab === 'past') return
        const createdEvents = evs.filter((e: any) => e.is_creator) as any[]
        const reqMap: Record<number, any[]> = {}
        await Promise.all(createdEvents.map(async (e: any) => {
          const r = await fetch(`/api/events/${e.id}/requests`, { headers: { Authorization: `Bearer ${token}` } })
          if (r.ok) { const d = await r.json(); reqMap[e.id] = (d.data ?? []).filter((x: any) => x.status === 'PENDING') }
        }))
        setRequests(reqMap)
      })
  }, [level, sport, tab])

  async function handleJoin(eventId: number) {
    const token = getAuthToken()
    if (!token) { window.location.href = '/login'; return }
    setJoiningId(eventId)
    try {
      const res = await fetch(`/api/events/${eventId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const newStatus = data.status === 'PENDING' ? 'pending' : 'accepted'
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? { ...e, join_status: newStatus }
              : e
          )
        )
      }
    } finally {
      setJoiningId(null)
    }
  }

  async function handleAccept(eventId: number, profileId: number) {
    const token = getAuthToken()
    if (!token) return
    await fetch(`/api/events/${eventId}/requests`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: profileId, action: 'accept' }),
    })
    setRequests((prev) => ({ ...prev, [eventId]: (prev[eventId] ?? []).filter((r) => r.profile_id !== profileId) }))
    setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, participants_count: e.participants_count + 1 } : e))
  }

  async function handleReject(eventId: number, profileId: number) {
    const token = getAuthToken()
    if (!token) return
    await fetch(`/api/events/${eventId}/requests`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: profileId, action: 'reject' }),
    })
    setRequests((prev) => ({ ...prev, [eventId]: (prev[eventId] ?? []).filter((r) => r.profile_id !== profileId) }))
  }

  async function handleLeave(eventId: number) {
    const token = getAuthToken()
    if (!token) { window.location.href = '/login'; return }
    setLeavingId(eventId)
    try {
      const res = await fetch(`/api/events/${eventId}/leave`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? { ...e, participants_count: Math.max(0, e.participants_count - 1), participants: (e.participants ?? []).filter((p: any) => p.user_id !== currentUserId) }
              : e
          )
        )
      }
    } finally {
      setLeavingId(null)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-extrabold text-gray-900">Événements</h1>
          <Link href="/events/new">
            <Button size="sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Créer
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-3 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setTab('upcoming')} className={cn('flex-1 py-1.5 rounded-lg text-xs font-bold transition-all', tab === 'upcoming' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>
            À venir
          </button>
          <button onClick={() => setTab('past')} className={cn('flex-1 py-1.5 rounded-lg text-xs font-bold transition-all', tab === 'past' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>
            Passés
          </button>
        </div>

        {/* Sport filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none mb-2">
          {SPORT_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setSport(f.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-200',
                sport === f.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>

        {/* Level filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {LEVEL_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setLevel(f.value)}
              className={cn(
                'px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-200',
                level === f.value
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl h-40 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🏅</p>
            <p className="font-bold text-gray-900 text-lg mb-2">Aucun événement</p>
            <p className="text-sm text-gray-500 mb-6">Sois le premier à créer un événement !</p>
            <Link href="/events/new">
              <Button>Créer un événement</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onJoin={handleJoin}
                onLeave={handleLeave}
                onAccept={handleAccept}
                onReject={handleReject}
                onScoreUpdate={(id, score, teamA, teamB) => setEvents(prev => prev.map(e => e.id === id ? { ...e, score, team_a: teamA, team_b: teamB } : e))}
                joining={joiningId === event.id}
                leaving={leavingId === event.id}
                currentUserId={currentUserId}
                pendingRequests={requests[event.id]}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
