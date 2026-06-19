'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CoachSession, Coach } from '@/types'
import BottomNav from '@/components/BottomNav'
import { cn } from '@/lib/utils'
import { getStoredUser, getAuthToken } from '@/lib/client-utils'
import Link from 'next/link'

type SessionFilter = 'all' | 'scheduled' | 'completed' | 'cancelled'

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  completed:  'bg-green-50 text-green-700 border-green-200',
  cancelled:  'bg-red-50 text-red-500 border-red-200',
}
const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Planifiée', completed: 'Terminée', cancelled: 'Annulée',
}

interface DashboardStats {
  upcoming: number
  completed: number
  totalRevenue: number
  uniqueClients: number
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-100">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-2', color)}>
        {icon}
      </div>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

function SessionCard({
  session,
  onStatusChange,
}: {
  session: CoachSession
  onStatusChange: (id: number, status: 'completed' | 'cancelled') => void
}) {
  const d = new Date(session.date)
  const isPast = d < new Date()
  const isToday = d.toDateString() === new Date().toDateString()

  return (
    <div className={cn(
      'bg-white rounded-3xl shadow-card border overflow-hidden transition-all',
      session.status === 'cancelled' ? 'opacity-60 border-gray-100' : 'border-gray-100'
    )}>
      {/* Left accent */}
      <div className="flex">
        <div className={cn('w-1.5 flex-shrink-0', {
          'bg-blue-400':  session.status === 'scheduled',
          'bg-green-400': session.status === 'completed',
          'bg-red-300':   session.status === 'cancelled',
        })} />

        <div className="flex-1 p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              {isToday && session.status === 'scheduled' && (
                <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full mb-1 inline-block">
                  Aujourd&apos;hui
                </span>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-8 h-8 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  <img
                    src={session.client?.avatar_url ?? `https://api.dicebear.com/8.x/avataaars/svg?seed=${session.client?.name}`}
                    alt={session.client?.name ?? ''}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{session.client?.name ?? 'Client'}</p>
                  <p className="text-xs text-gray-400">{session.client?.city}</p>
                </div>
              </div>
            </div>
            <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full border flex-shrink-0', STATUS_STYLES[session.status] ?? 'bg-gray-100')}>
              {STATUS_LABELS[session.status] ?? session.status}
            </span>
          </div>

          {/* Details */}
          <div className="flex flex-col gap-1.5 text-xs text-gray-500 mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium text-gray-700">
                {d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
              <span className="text-gray-400">
                {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{session.duration_minutes} min</span>
              {session.price && <span className="ml-auto font-bold text-gray-700">💶 {session.price}€</span>}
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <span>{session.location}</span>
            </div>
          </div>

          {session.notes && (
            <p className="text-xs text-gray-400 italic mb-3 bg-gray-50 rounded-xl px-3 py-2">
              &ldquo;{session.notes}&rdquo;
            </p>
          )}

          {/* Actions */}
          {session.status === 'scheduled' && isPast && (
            <div className="flex gap-2">
              <button
                onClick={() => onStatusChange(session.id, 'completed')}
                className="flex-1 py-2 rounded-xl bg-green-500 text-white text-xs font-bold active:scale-95 transition-transform"
              >
                ✓ Marquer terminée
              </button>
              <button
                onClick={() => onStatusChange(session.id, 'cancelled')}
                className="px-3 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-bold border border-red-200 active:scale-95 transition-transform"
              >
                ✕
              </button>
            </div>
          )}
          {session.status === 'scheduled' && !isPast && (
            <div className="flex gap-2">
              <Link href={`/chat?userId=${session.client_id}`} className="flex-1">
                <button className="w-full py-2 rounded-xl bg-primary-50 text-primary-600 text-xs font-bold border border-primary-200 active:scale-95 transition-transform">
                  💬 Contacter
                </button>
              </Link>
              <button
                onClick={() => onStatusChange(session.id, 'cancelled')}
                className="px-3 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-bold border border-red-200 active:scale-95 transition-transform"
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CoachDashboardPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<CoachSession[]>([])
  const [stats, setStats] = useState<DashboardStats>({ upcoming: 0, completed: 0, totalRevenue: 0, uniqueClients: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<SessionFilter>('all')
  const [coach, setCoach] = useState<Coach | null>(null)

  useEffect(() => {
    const u = getStoredUser()
    if (!u) { router.push('/login'); return }
    loadDashboard()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadDashboard() {
    const token = getAuthToken()
    if (!token) { router.push('/login'); return }
    setLoading(true)
    try {
      const [sessionsRes, coachRes] = await Promise.all([
        fetch('/api/coach/sessions?role=coach', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/coaches', { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (sessionsRes.ok) {
        const data = await sessionsRes.json()
        setSessions(data.data ?? [])
        if (data.stats) setStats(data.stats)
      }
      if (coachRes.ok) {
        const cData = await coachRes.json()
        const u = getStoredUser()
        if (u && cData.data) {
          const myCoach = cData.data.find((c: Coach) => c.user_id === u.id)
          setCoach(myCoach ?? null)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(sessionId: number, status: 'completed' | 'cancelled') {
    const token = getAuthToken()
    if (!token) return
    const res = await fetch(`/api/coach/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, status } : s))
      // Update stats
      setStats((prev) => ({
        ...prev,
        upcoming: status === 'cancelled' ? Math.max(0, prev.upcoming - 1) : prev.upcoming,
        completed: status === 'completed' ? prev.completed + 1 : prev.completed,
      }))
    }
  }

  const filteredSessions = sessions.filter((s) => filter === 'all' || s.status === filter)
  const upcomingSessions = sessions
    .filter((s) => s.status === 'scheduled' && new Date(s.date) > new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Tableau de bord</h1>
            <p className="text-xs text-gray-400">Espace coach — MEL</p>
          </div>
          {coach && (
            <Link href={`/coaches/${coach.id}`}
              className="ml-auto text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-xl">
              Mon profil
            </Link>
          )}
        </div>
      </div>

      <div className="px-4 py-5 pb-28 max-w-lg mx-auto">
        {loading ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />)}
            </div>
            {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-3xl h-36 animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatCard icon="📅" label="Séances à venir" value={stats.upcoming} color="bg-blue-50" />
              <StatCard icon="✅" label="Séances réalisées" value={stats.completed} color="bg-green-50" />
              <StatCard icon="💶" label="Revenus totaux" value={`${stats.totalRevenue}€`} color="bg-yellow-50" />
              <StatCard icon="👥" label="Clients uniques" value={stats.uniqueClients} color="bg-purple-50" />
            </div>

            {/* Next sessions strip */}
            {upcomingSessions.length > 0 && (
              <div className="mb-5">
                <h2 className="text-sm font-bold text-gray-900 mb-3">Prochaines séances</h2>
                <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
                  {upcomingSessions.map((s) => {
                    const d = new Date(s.date)
                    const isToday = d.toDateString() === new Date().toDateString()
                    return (
                      <div key={s.id} className="flex-shrink-0 w-36 bg-white rounded-2xl shadow-card border border-gray-100 p-3">
                        <div className="w-8 h-8 rounded-xl overflow-hidden bg-gray-100 mb-2">
                          <img
                            src={s.client?.avatar_url ?? `https://api.dicebear.com/8.x/avataaars/svg?seed=${s.client?.name}`}
                            alt="" className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-xs font-bold text-gray-900 truncate">{s.client?.name?.split(' ')[0]}</p>
                        <p className={cn('text-[10px] font-semibold mt-0.5', isToday ? 'text-orange-500' : 'text-gray-400')}>
                          {isToday ? 'Aujourd\'hui' : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {s.duration_minutes}min
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Sessions filter */}
            <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-4">
              {([
                { key: 'all', label: 'Toutes' },
                { key: 'scheduled', label: 'À venir' },
                { key: 'completed', label: 'Terminées' },
                { key: 'cancelled', label: 'Annulées' },
              ] as { key: SessionFilter; label: string }[]).map((f) => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={cn(
                    'flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-all',
                    filter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
                  )}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sessions list */}
            {filteredSessions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">📅</p>
                <p className="font-bold text-gray-900 mb-1">Aucune séance</p>
                <p className="text-sm text-gray-400">
                  {filter === 'all' ? 'Tes séances apparaîtront ici une fois réservées.' : `Aucune séance "${STATUS_LABELS[filter]}".`}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-gray-400 font-medium">
                  {filteredSessions.length} séance{filteredSessions.length > 1 ? 's' : ''}
                </p>
                {filteredSessions.map((s) => (
                  <SessionCard key={s.id} session={s} onStatusChange={handleStatusChange} />
                ))}
              </div>
            )}

            {/* CTA — if not coach */}
            {!coach && !loading && (
              <div className="mt-6 bg-gradient-to-r from-primary-500 to-emerald-500 rounded-3xl p-5 text-white">
                <p className="font-extrabold text-base mb-1">Tu n&apos;es pas encore coach</p>
                <p className="text-sm text-white/80 mb-4">Crée ton profil coach pour accéder au dashboard complet.</p>
                <Link href="/coaches/become"
                  className="block bg-white text-primary-600 font-bold text-sm text-center py-3 rounded-2xl">
                  Devenir coach →
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
