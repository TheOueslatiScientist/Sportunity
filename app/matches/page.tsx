'use client'
import { useState, useEffect } from 'react'
import { Match, Tournament, Competition, Sport } from '@/types'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import { cn, formatEventDate, levelLabel } from '@/lib/utils'
import { getStoredUser, getAuthToken } from '@/lib/client-utils'

// ─── Tab types ────────────────────────────────────────────────────────────────
type Tab = 'matches' | 'tournaments' | 'competitions'

const SPORT_FILTERS = [
  { value: 'all', label: '🏅 Tous' },
  { value: 'Football', label: '⚽ Foot' },
  { value: 'Basketball', label: '🏀 Basket' },
  { value: 'Tennis', label: '🎾 Tennis' },
  { value: 'Running', label: '🏃 Running' },
  { value: 'Padel', label: '🏓 Padel' },
  { value: 'Volleyball', label: '🏐 Volley' },
  { value: 'Natation', label: '🏊 Natation' },
]

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Débutant', intermediate: 'Intermédiaire',
  advanced: 'Avancé', all: 'Tous niveaux',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-50 text-green-700',
  full: 'bg-red-50 text-red-600',
  completed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-orange-50 text-orange-600',
  in_progress: 'bg-blue-50 text-blue-700',
}
const STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert', full: 'Complet', completed: 'Terminé',
  cancelled: 'Annulé', in_progress: 'En cours',
}
const TYPE_LABELS: Record<string, string> = {
  race: '🏁 Course', tournament: '🏆 Tournoi',
  championship: '🥇 Championnat', other: '🎯 Autre',
}

// ─── Match Card ───────────────────────────────────────────────────────────────
function MatchCard({
  match,
  currentUserId,
  joining,
  onJoin,
  onLeave,
}: {
  match: Match & { isJoined?: boolean; distance?: number }
  currentUserId?: number
  joining: boolean
  onJoin: (id: number) => void
  onLeave: (id: number) => void
}) {
  const filled = match.players_count
  const total  = match.max_players
  const pct    = Math.round((filled / total) * 100)
  const isJoined = match.isJoined
  const isCreator = match.creator_id === currentUserId
  const isFull = match.status === 'full'

  return (
    <Link href={`/matches/${match.id}`} className="block">
      <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden hover:shadow-card-hover transition-all active:scale-[0.98]">
        {/* Sport color top band */}
        <div className="h-1.5 w-full" style={{ background: match.sport?.color ?? '#22c55e' }} />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{match.sport?.icon ?? '🏅'}</span>
                <h3 className="font-extrabold text-gray-900 text-base truncate">{match.title}</h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', STATUS_COLORS[match.status] ?? 'bg-gray-100 text-gray-500')}>
                  {STATUS_LABELS[match.status] ?? match.status}
                </span>
                {match.level && match.level !== 'all' && (
                  <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {LEVEL_LABELS[match.level] ?? match.level}
                  </span>
                )}
                {match.has_teams && (
                  <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                    ⚔️ Équipes
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-1.5 mb-3 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium text-gray-700">{formatEventDate(match.date)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{match.location}</span>
              <span className="text-gray-400">· {match.city}</span>
              {(match as { distance?: number }).distance != null && (
                <span className="ml-auto text-primary-500 font-bold">
                  📍 {((match as { distance?: number }).distance! < 1)
                    ? `${Math.round((match as { distance?: number }).distance! * 1000)}m`
                    : `${(match as { distance?: number }).distance!.toFixed(1)}km`}
                </span>
              )}
            </div>
          </div>

          {/* Participants bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex -space-x-2">
                {(match.participants ?? []).slice(0, 5).map((p, i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white overflow-hidden bg-gray-200">
                    <img
                      src={p.avatar_url ?? `https://api.dicebear.com/8.x/avataaars/svg?seed=${p.name}`}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {filled > 5 && (
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-600">
                    +{filled - 5}
                  </div>
                )}
              </div>
              <span className="font-bold text-gray-700">
                {filled} / {total} <span className="text-gray-400 font-normal">joueurs</span>
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: isFull ? '#ef4444' : (match.sport?.color ?? '#22c55e') }}
              />
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={(e) => {
              e.preventDefault()
              if (isJoined) onLeave(match.id)
              else onJoin(match.id)
            }}
            disabled={joining || (isFull && !isJoined) || isCreator}
            className={cn(
              'w-full py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-95',
              isJoined
                ? 'bg-red-50 text-red-600 border border-red-200'
                : isFull
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : isCreator
                    ? 'bg-gray-100 text-gray-500 cursor-default'
                    : 'bg-primary-500 text-white shadow-sm shadow-primary-500/30'
            )}
          >
            {joining
              ? '…'
              : isCreator
                ? 'Mon match'
                : isJoined
                  ? 'Quitter le match'
                  : isFull
                    ? 'Complet'
                    : 'Rejoindre →'}
          </button>
        </div>
      </div>
    </Link>
  )
}

// ─── Tournament Card ──────────────────────────────────────────────────────────
function TournamentCard({ t }: { t: Tournament }) {
  const spotsLeft = t.max_teams - t.teams_count
  return (
    <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden">
      <div className="h-1.5 w-full" style={{ background: t.sport?.color ?? '#22c55e' }} />
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
               style={{ backgroundColor: (t.sport?.color ?? '#22c55e') + '20' }}>
            {t.sport?.icon ?? '🏆'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-gray-900 text-base leading-snug">{t.title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{t.city}</p>
          </div>
          <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0', STATUS_COLORS[t.status] ?? 'bg-gray-100')}>
            {STATUS_LABELS[t.status] ?? t.status}
          </span>
        </div>

        {t.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">{t.description}</p>
        )}

        <div className="flex flex-col gap-1.5 text-xs text-gray-500 mb-3">
          <div className="flex items-center gap-1.5">
            <span>📅</span>
            <span className="font-medium text-gray-700">{formatEventDate(t.start_date)}</span>
            {t.end_date && t.end_date !== t.start_date && (
              <span className="text-gray-400">→ {new Date(t.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span>📍</span>
            <span>{t.location}</span>
          </div>
          {t.prize && (
            <div className="flex items-center gap-1.5">
              <span>🏆</span>
              <span className="font-medium text-yellow-600">{t.prize}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-700">
            {t.teams_count} / {t.max_teams} équipes
            {spotsLeft > 0 && <span className="text-green-600 ml-1">· {spotsLeft} place{spotsLeft > 1 ? 's' : ''}</span>}
          </span>
          <button className="px-4 py-2 rounded-2xl bg-primary-500 text-white text-xs font-bold active:scale-95 transition-transform">
            S&apos;inscrire →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Competition Card ──────────────────────────────────────────────────────────
function CompetitionCard({
  comp,
  currentUserId,
  joining,
  onJoin,
  onLeave,
}: {
  comp: Competition & { isJoined?: boolean }
  currentUserId?: number
  joining: boolean
  onJoin: (id: number) => void
  onLeave: (id: number) => void
}) {
  const isJoined = comp.isJoined
  const isFull = comp.status === 'full'
  const spotsLeft = comp.max_participants - comp.participants_count

  return (
    <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden">
      <div className="h-1.5 w-full" style={{ background: comp.sport?.color ?? '#3b82f6' }} />
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
               style={{ backgroundColor: (comp.sport?.color ?? '#3b82f6') + '20' }}>
            {comp.sport?.icon ?? '🏅'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-gray-900 text-base leading-snug">{comp.title}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-semibold text-gray-500">{TYPE_LABELS[comp.type] ?? comp.type}</span>
              <span className="text-gray-300">·</span>
              <span className="text-[10px] text-gray-400">{comp.city}</span>
            </div>
          </div>
          <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0', STATUS_COLORS[comp.status] ?? 'bg-gray-100')}>
            {STATUS_LABELS[comp.status] ?? comp.status}
          </span>
        </div>

        {comp.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">{comp.description}</p>
        )}

        <div className="flex flex-col gap-1.5 text-xs text-gray-500 mb-3">
          <div className="flex items-center gap-1.5">
            <span>📅</span>
            <span className="font-medium text-gray-700">{formatEventDate(comp.date)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>📍</span>
            <span>{comp.location}</span>
          </div>
          <div className="flex items-center gap-3">
            {comp.distance_km && (
              <span className="flex items-center gap-1">🏁 <span className="font-medium text-gray-700">{comp.distance_km}km</span></span>
            )}
            {comp.price_entry != null && (
              <span className="flex items-center gap-1">💶 <span className="font-medium text-gray-700">{comp.price_entry}€</span></span>
            )}
            <span className="ml-auto font-bold text-gray-700">
              {comp.participants_count} / {comp.max_participants}
              {spotsLeft > 0 && !isFull && (
                <span className="text-green-600 ml-1">· {spotsLeft} places</span>
              )}
            </span>
          </div>
        </div>

        <button
          onClick={() => isJoined ? onLeave(comp.id) : onJoin(comp.id)}
          disabled={joining || (isFull && !isJoined)}
          className={cn(
            'w-full py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-95',
            isJoined
              ? 'bg-red-50 text-red-600 border border-red-200'
              : isFull
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-primary-500 text-white shadow-sm shadow-primary-500/30'
          )}
        >
          {joining ? '…' : isJoined ? 'Se désinscrire' : isFull ? 'Complet' : 'S\'inscrire →'}
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MatchesPage() {
  const [tab, setTab] = useState<Tab>('matches')
  const [sport, setSport] = useState('all')
  const [matches, setMatches] = useState<(Match & { isJoined?: boolean; distance?: number })[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [competitions, setCompetitions] = useState<(Competition & { isJoined?: boolean })[]>([])
  const [loading, setLoading] = useState(true)
  const [joiningId, setJoiningId] = useState<number | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | undefined>()
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)

  useEffect(() => {
    const u = getStoredUser()
    if (u) setCurrentUserId(u.id)
    navigator.geolocation?.getCurrentPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude) },
      () => {}
    )
  }, [])

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, sport, userLat, userLng])

  async function loadData() {
    setLoading(true)
    const token = getAuthToken()
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
    const sportParam = sport !== 'all' ? `&sport=${sport}` : ''
    const latParam   = userLat ? `&lat=${userLat}&lng=${userLng}` : ''

    try {
      if (tab === 'matches') {
        const res = await fetch(`/api/matches?${sportParam}${latParam}`, { headers })
        const data = await res.json()
        setMatches(data.data ?? [])
      } else if (tab === 'tournaments') {
        const res = await fetch(`/api/tournaments?${sportParam}`, { headers })
        const data = await res.json()
        setTournaments(data.data ?? [])
      } else {
        const res = await fetch(`/api/competitions?${sportParam}`, { headers })
        const data = await res.json()
        setCompetitions(data.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleJoinMatch(matchId: number) {
    const token = getAuthToken()
    if (!token) { window.location.href = '/login'; return }
    setJoiningId(matchId)
    const res = await fetch(`/api/matches/${matchId}/join`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setMatches((prev) => prev.map((m) =>
        m.id === matchId ? { ...m, ...data.data, isJoined: true } : m
      ))
    }
    setJoiningId(null)
  }

  async function handleLeaveMatch(matchId: number) {
    const token = getAuthToken()
    if (!token) return
    setJoiningId(matchId)
    const res = await fetch(`/api/matches/${matchId}/leave`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setMatches((prev) => prev.map((m) =>
        m.id === matchId ? { ...m, ...data.data, isJoined: false } : m
      ))
    }
    setJoiningId(null)
  }

  async function handleJoinComp(compId: number) {
    const token = getAuthToken()
    if (!token) { window.location.href = '/login'; return }
    setJoiningId(compId)
    const res = await fetch(`/api/competitions/${compId}/join`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setCompetitions((prev) => prev.map((c) =>
        c.id === compId ? { ...c, ...data.data, isJoined: true } : c
      ))
    }
    setJoiningId(null)
  }

  async function handleLeaveComp(compId: number) {
    const token = getAuthToken()
    if (!token) return
    setJoiningId(compId)
    const res = await fetch(`/api/competitions/${compId}/join`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setCompetitions((prev) => prev.map((c) =>
        c.id === compId ? { ...c, ...data.data, isJoined: false } : c
      ))
    }
    setJoiningId(null)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Sport MEL</h1>
            <p className="text-xs text-gray-400">Matchs, tournois &amp; compétitions</p>
          </div>
          <Link
            href="/matches/new"
            className="flex items-center gap-1.5 bg-primary-500 text-white px-3 py-2 rounded-2xl text-xs font-bold shadow-sm shadow-primary-500/30 active:scale-95 transition-transform"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Créer
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-3">
          {([
            { key: 'matches', icon: '⚽', label: 'Matchs' },
            { key: 'tournaments', icon: '🏆', label: 'Tournois' },
            { key: 'competitions', icon: '🏁', label: 'Compéts' },
          ] as { key: Tab; icon: string; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-bold transition-all',
                tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Sport filter pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {SPORT_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setSport(f.value)}
              className={cn('px-3 py-1.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all',
                sport === f.value ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-3xl h-52 animate-pulse" />)}
          </div>
        ) : tab === 'matches' ? (
          matches.length === 0 ? (
            <EmptyState tab="matches" />
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-gray-400 font-medium">{matches.length} match{matches.length > 1 ? 's' : ''}</p>
              {matches.map((m) => (
                <MatchCard
                  key={m.id} match={m} currentUserId={currentUserId}
                  joining={joiningId === m.id}
                  onJoin={handleJoinMatch} onLeave={handleLeaveMatch}
                />
              ))}
            </div>
          )
        ) : tab === 'tournaments' ? (
          tournaments.length === 0 ? (
            <EmptyState tab="tournaments" />
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-gray-400 font-medium">{tournaments.length} tournoi{tournaments.length > 1 ? 's' : ''}</p>
              {tournaments.map((t) => <TournamentCard key={t.id} t={t} />)}
            </div>
          )
        ) : (
          competitions.length === 0 ? (
            <EmptyState tab="competitions" />
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-gray-400 font-medium">{competitions.length} compétition{competitions.length > 1 ? 's' : ''}</p>
              {competitions.map((c) => (
                <CompetitionCard
                  key={c.id} comp={c} currentUserId={currentUserId}
                  joining={joiningId === c.id}
                  onJoin={handleJoinComp} onLeave={handleLeaveComp}
                />
              ))}
            </div>
          )
        )}
      </div>

      <BottomNav />
    </div>
  )
}

function EmptyState({ tab }: { tab: Tab }) {
  const config = {
    matches:      { emoji: '⚽', text: 'Aucun match trouvé', sub: 'Sois le premier à en créer un !' },
    tournaments:  { emoji: '🏆', text: 'Aucun tournoi trouvé', sub: 'Organise le premier tournoi MEL !' },
    competitions: { emoji: '🏁', text: 'Aucune compétition', sub: 'Propose une course ou un open !' },
  }
  const { emoji, text, sub } = config[tab]
  return (
    <div className="text-center py-16">
      <p className="text-5xl mb-4">{emoji}</p>
      <p className="font-bold text-gray-900 text-lg mb-2">{text}</p>
      <p className="text-sm text-gray-500 mb-4">{sub}</p>
      <Link href="/matches/new"
        className="inline-block bg-primary-500 text-white px-6 py-2.5 rounded-2xl text-sm font-bold">
        Créer maintenant
      </Link>
    </div>
  )
}

