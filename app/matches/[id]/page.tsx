'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Match, Profile } from '@/types'
import BottomNav from '@/components/BottomNav'
import Button from '@/components/ui/Button'
import { cn, formatEventDate, levelLabel } from '@/lib/utils'
import { getStoredUser, getAuthToken } from '@/lib/client-utils'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-50 text-green-700 border-green-200',
  full: 'bg-red-50 text-red-600 border-red-200',
  completed: 'bg-gray-100 text-gray-500 border-gray-200',
  cancelled: 'bg-orange-50 text-orange-600 border-orange-200',
}
const STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert', full: 'Complet', completed: 'Terminé', cancelled: 'Annulé',
}

function ParticipantAvatar({ profile, label }: { profile: Profile; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 border-2 border-white shadow-sm">
        <img
          src={profile.avatar_url ?? `https://api.dicebear.com/8.x/avataaars/svg?seed=${profile.name}`}
          alt={profile.name}
          className="w-full h-full object-cover"
        />
      </div>
      <p className="text-[10px] text-gray-600 font-medium text-center leading-tight w-12 truncate">{profile.name.split(' ')[0]}</p>
      {label && <span className="text-[9px] text-gray-400">{label}</span>}
    </div>
  )
}

export default function MatchDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const matchId = parseInt(id)

  const [match, setMatch] = useState<(Match & { isJoined?: boolean }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  useEffect(() => {
    const u = getStoredUser()
    if (u) setCurrentUserId(u.id)
    loadMatch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId])

  async function loadMatch() {
    const token = getAuthToken()
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
    const res = await fetch(`/api/matches/${matchId}`, { headers })
    if (res.ok) {
      const data = await res.json()
      setMatch(data.data)
    }
    setLoading(false)
  }

  async function handleJoin() {
    const token = getAuthToken()
    if (!token) { router.push('/login'); return }
    setJoining(true)
    const res = await fetch(`/api/matches/${matchId}/join`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      await loadMatch()
    }
    setJoining(false)
  }

  async function handleLeave() {
    const token = getAuthToken()
    if (!token) return
    setJoining(true)
    const res = await fetch(`/api/matches/${matchId}/leave`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      await loadMatch()
    }
    setJoining(false)
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-5xl">⚽</p>
        <p className="font-bold text-gray-900">Match introuvable</p>
        <Button onClick={() => router.push('/matches')}>Retour</Button>
      </div>
    )
  }

  const isJoined = match.isJoined
  const isCreator = match.creator_id === currentUserId
  const isFull = match.status === 'full'
  const filled = match.players_count
  const total  = match.max_players
  const pct    = Math.round((filled / total) * 100)
  const spotsLeft = total - filled

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-white">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-12 pb-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className={cn('text-xs font-bold px-3 py-1.5 rounded-full border', STATUS_COLORS[match.status] ?? 'bg-gray-100')}>
            {STATUS_LABELS[match.status] ?? match.status}
          </span>
        </div>

        {/* Color band */}
        <div className="h-1.5 mx-4 rounded-full" style={{ background: match.sport?.color ?? '#22c55e' }} />

        <div className="px-4 py-4">
          {/* Title */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                 style={{ backgroundColor: (match.sport?.color ?? '#22c55e') + '20' }}>
              {match.sport?.icon ?? '🏅'}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 leading-tight">{match.title}</h1>
              <p className="text-sm text-gray-400 mt-0.5">{match.sport?.name}</p>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {match.level && (
              <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                {levelLabel(match.level)}
              </span>
            )}
            {match.has_teams && (
              <span className="text-xs font-semibold bg-purple-50 text-purple-700 px-3 py-1 rounded-full">
                ⚔️ Format équipes
              </span>
            )}
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-2xl p-3">
              <p className="text-xs text-gray-400 mb-1">📅 Date</p>
              <p className="text-sm font-bold text-gray-900">{formatEventDate(match.date)}</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-3">
              <p className="text-xs text-gray-400 mb-1">📍 Lieu</p>
              <p className="text-sm font-bold text-gray-900 truncate">{match.location}</p>
              <p className="text-xs text-gray-400">{match.city}</p>
            </div>
          </div>

          {/* Spots bar */}
          <div className="bg-gray-50 rounded-2xl p-3 mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-bold text-gray-900">{filled} joueur{filled > 1 ? 's' : ''} inscrit{filled > 1 ? 's' : ''}</span>
              <span className="font-bold text-gray-500">
                {isFull ? (
                  <span className="text-red-500">Complet</span>
                ) : (
                  <span className="text-green-600">{spotsLeft} place{spotsLeft > 1 ? 's' : ''} libre{spotsLeft > 1 ? 's' : ''}</span>
                )}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: isFull ? '#ef4444' : (match.sport?.color ?? '#22c55e') }} />
            </div>
            <p className="text-xs text-gray-400 mt-1.5 text-right">{total} max</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 pb-32 flex flex-col gap-5">
        {/* Description */}
        {match.description && (
          <div className="bg-white rounded-3xl p-4 shadow-card border border-gray-100">
            <h2 className="font-bold text-gray-900 mb-2 text-sm">À propos</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{match.description}</p>
          </div>
        )}

        {/* Teams view */}
        {match.has_teams && (match.team_a?.length ?? 0) > 0 ? (
          <div className="bg-white rounded-3xl p-4 shadow-card border border-gray-100">
            <h2 className="font-bold text-gray-900 mb-4 text-sm">Composition des équipes</h2>
            <div className="grid grid-cols-2 gap-4">
              {/* Team A */}
              <div>
                <p className="text-xs font-bold text-center mb-3 px-3 py-1 rounded-xl"
                   style={{ backgroundColor: (match.sport?.color ?? '#22c55e') + '20', color: match.sport?.color ?? '#22c55e' }}>
                  {match.team_a_name ?? 'Équipe A'}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {(match.team_a ?? []).map((p, i) => <ParticipantAvatar key={i} profile={p} />)}
                  {Array.from({ length: Math.ceil(total / 2) - (match.team_a?.length ?? 0) }).map((_, i) => (
                    <div key={`empty-a-${i}`} className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center">
                        <span className="text-gray-300 text-xs">+</span>
                      </div>
                      <p className="text-[10px] text-gray-300 w-12 text-center">libre</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* VS divider */}
              <div className="absolute left-1/2 -translate-x-1/2 hidden" />

              {/* Team B */}
              <div>
                <p className="text-xs font-bold text-center mb-3 px-3 py-1 rounded-xl bg-gray-100 text-gray-600">
                  {match.team_b_name ?? 'Équipe B'}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {(match.team_b ?? []).map((p, i) => <ParticipantAvatar key={i} profile={p} />)}
                  {Array.from({ length: Math.ceil(total / 2) - (match.team_b?.length ?? 0) }).map((_, i) => (
                    <div key={`empty-b-${i}`} className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center">
                        <span className="text-gray-300 text-xs">+</span>
                      </div>
                      <p className="text-[10px] text-gray-300 w-12 text-center">libre</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* All participants */
          (match.participants ?? []).length > 0 && (
            <div className="bg-white rounded-3xl p-4 shadow-card border border-gray-100">
              <h2 className="font-bold text-gray-900 mb-4 text-sm">
                Participants ({filled}/{total})
              </h2>
              <div className="flex flex-wrap gap-3">
                {(match.participants ?? []).map((p, i) => (
                  <ParticipantAvatar key={i} profile={p}
                    label={p.user_id === match.creator_id ? 'Créateur' : undefined} />
                ))}
                {Array.from({ length: spotsLeft }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center">
                      <span className="text-gray-300 text-xs">+</span>
                    </div>
                    <p className="text-[10px] text-gray-300 w-12 text-center">libre</p>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* Organizer */}
        {match.creator && (
          <div className="bg-white rounded-3xl p-4 shadow-card border border-gray-100">
            <h2 className="font-bold text-gray-900 mb-3 text-sm">Organisateur</h2>
            <Link href={`/users/${match.creator_id}`} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                <img
                  src={match.creator.avatar_url ?? `https://api.dicebear.com/8.x/avataaars/svg?seed=${match.creator.name}`}
                  alt={match.creator.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{match.creator.name}</p>
                <p className="text-xs text-gray-400">{match.creator.city}</p>
              </div>
              <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </div>

      {/* Fixed CTA */}
      {!isCreator && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4" style={{ zIndex: 900 }}>
          {isJoined ? (
            <div className="flex gap-3">
              <Button fullWidth variant="secondary" loading={joining} onClick={handleLeave}>
                Quitter le match
              </Button>
              <Link href="/chat" className="flex-1">
                <Button fullWidth>💬 Chat</Button>
              </Link>
            </div>
          ) : isFull ? (
            <Button fullWidth disabled>Complet — Plus de place</Button>
          ) : (
            <Button fullWidth size="lg" loading={joining} onClick={handleJoin}>
              Rejoindre le match ({spotsLeft} place{spotsLeft > 1 ? 's' : ''})
            </Button>
          )}
        </div>
      )}

      {isCreator && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4" style={{ zIndex: 900 }}>
          <div className="bg-primary-50 rounded-2xl px-4 py-3 text-center">
            <p className="text-sm font-bold text-primary-700">Tu es l&apos;organisateur de ce match</p>
            <p className="text-xs text-primary-500 mt-0.5">{filled} / {total} joueurs inscrits</p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
