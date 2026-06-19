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

export default function EventsPage() {
  const [events, setEvents] = useState<SportEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [joiningId, setJoiningId] = useState<number | null>(null)
  const [leavingId, setLeavingId] = useState<number | null>(null)
  const [level, setLevel] = useState('all')
  const [currentUserId, setCurrentUserId] = useState<number | undefined>()

  useEffect(() => {
    const user = getStoredUser()
    if (user) setCurrentUserId(user.id)
  }, [])

  useEffect(() => {
    const token = getAuthToken()
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
    const params = level !== 'all' ? `?level=${level}` : ''
    fetch(`/api/events${params}`, { headers })
      .then((r) => r.json())
      .then((data) => { setEvents(data.data ?? []); setLoading(false) })
  }, [level])

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
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? { ...e, participants_count: e.participants_count + 1, participants: [...(e.participants ?? []), { id: 0, user_id: currentUserId!, name: '', avatar_url: '', is_coach: false, email: '' }] }
              : e
          )
        )
      }
    } finally {
      setJoiningId(null)
    }
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
              ? { ...e, participants_count: Math.max(0, e.participants_count - 1), participants: (e.participants ?? []).filter((p) => p.user_id !== currentUserId) }
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
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-4">
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

        {/* Level filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {LEVEL_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setLevel(f.value)}
              className={cn(
                'px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-200',
                level === f.value
                  ? 'bg-primary-500 text-white'
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
                joining={joiningId === event.id}
                leaving={leavingId === event.id}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
