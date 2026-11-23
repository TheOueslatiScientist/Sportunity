'use client'
import { useState } from 'react'
import { SportEvent } from '@/types'
import { formatEventDate, levelLabel, cn } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { getAuthToken } from '@/lib/client-utils'

interface EventCardProps {
  event: SportEvent & { join_status?: 'none' | 'pending' | 'accepted'; is_creator?: boolean; score?: string | null; team_a?: string | null; team_b?: string | null }
  onJoin?: (id: number) => void
  onLeave?: (id: number) => void
  onAccept?: (eventId: number, profileId: number) => void
  onReject?: (eventId: number, profileId: number) => void
  onScoreUpdate?: (eventId: number, score: string, teamA: string, teamB: string) => void
  joining?: boolean
  leaving?: boolean
  currentUserId?: number
  pendingRequests?: { profile_id: number; profile: { name: string; avatar_url?: string } | null }[]
}

export default function EventCard({ event, onJoin, onLeave, onAccept, onReject, onScoreUpdate, joining, leaving, currentUserId, pendingRequests }: EventCardProps) {
  const spotsLeft = event.max_participants - event.participants_count
  const isFull = spotsLeft <= 0
  const joinStatus = event.join_status ?? (event.participants?.some((p) => p.user_id === currentUserId) ? 'accepted' : 'none')
  const isParticipant = joinStatus === 'accepted'
  const isPending = joinStatus === 'pending'
  const isCreator = event.is_creator ?? event.creator_id === currentUserId
  const isPast = new Date(event.date) < new Date()
  const [scoreEdit, setScoreEdit] = useState(false)
  const [scoreA, setScoreA] = useState('')
  const [scoreB, setScoreB] = useState('')
  const [teamAName, setTeamAName] = useState(event.team_a ?? '')
  const [teamBName, setTeamBName] = useState(event.team_b ?? '')
  const [savingScore, setSavingScore] = useState(false)

  async function submitScore() {
    const token = getAuthToken()
    if (!token || !scoreA || !scoreB) return
    setSavingScore(true)
    const scoreStr = `${scoreA} - ${scoreB}`
    const res = await fetch(`/api/events/${event.id}/score`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: scoreStr, team_a: teamAName, team_b: teamBName }),
    })
    if (res.ok) {
      onScoreUpdate?.(event.id, scoreStr, teamAName, teamBName)
      setScoreEdit(false)
    }
    setSavingScore(false)
  }

  return (
    <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden hover:shadow-card-hover transition-all duration-300 active:scale-[0.98]">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: (event.sport?.color ?? '#22c55e') + '20' }}
            >
              {event.sport?.icon ?? '🏅'}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{event.title}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{event.sport?.name}</p>
            </div>
          </div>
          {event.level && (
            <Badge variant={
              event.level === 'beginner' ? 'success' :
              event.level === 'advanced' || event.level === 'intermediate' ? 'info' : 'default'
            }>
              {levelLabel(event.level)}
            </Badge>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="px-4 pb-3 flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <svg className="w-3.5 h-3.5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{formatEventDate(event.date)}</span>
        </div>
        {event.infrastructure && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span className="truncate max-w-[140px]">{event.infrastructure.name}</span>
          </div>
        )}
      </div>

      {/* Participants bar */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1">
            {/* Avatar stack */}
            <div className="flex -space-x-2">
              {(event.participants ?? []).slice(0, 3).map((p, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full border-2 border-white bg-primary-100 flex items-center justify-center text-[10px] font-bold text-primary-600 overflow-hidden"
                >
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={p.name ?? ''} className="w-full h-full object-cover" />
                  ) : (
                    p.name?.[0] ?? '?'
                  )}
                </div>
              ))}
            </div>
            <span className="text-xs text-gray-500 ml-1">
              {event.participants_count}/{event.max_participants}
            </span>
          </div>
          <span className={cn('text-xs font-semibold', isFull ? 'text-red-500' : 'text-primary-600')}>
            {isFull ? 'Complet' : `${spotsLeft} place${spotsLeft > 1 ? 's' : ''} restante${spotsLeft > 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', isFull ? 'bg-red-400' : 'bg-primary-500')}
            style={{ width: `${(event.participants_count / event.max_participants) * 100}%` }}
          />
        </div>

        {/* Participant actions */}
        {!isCreator && onJoin && !isParticipant && !isPending && !isFull && (
          <Button fullWidth size="sm" className="mt-3" loading={joining} onClick={() => onJoin(event.id)}>
            Rejoindre l&apos;événement
          </Button>
        )}
        {!isCreator && isPending && (
          <div className="mt-3 text-center text-xs font-semibold text-orange-500 bg-orange-50 rounded-xl py-2">
            ⏳ Demande en attente d'approbation
          </div>
        )}
        {!isCreator && isParticipant && (
          <div className="mt-3 flex items-center gap-2">
            <a href={`/events/${event.id}/chat`} className="flex-1 text-center text-xs font-semibold text-primary-600 bg-primary-50 rounded-xl py-2 flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 3H3a2 2 0 00-2 2v13a2 2 0 002 2h7l3 3 3-3h5a2 2 0 002-2V5a2 2 0 00-2-2z" /></svg>
              Chat du groupe
            </a>
            {onLeave && (
              <Button variant="secondary" size="sm" loading={leaving} onClick={() => onLeave(event.id)} className="text-red-500 border-red-100 hover:bg-red-50">
                Quitter
              </Button>
            )}
          </div>
        )}

        {/* Creator: pending requests */}
        {isCreator && (pendingRequests?.length ?? 0) > 0 && (
          <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Demandes ({pendingRequests!.length})</p>
            {pendingRequests!.map((req) => (
              <div key={req.profile_id} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                  <img src={req.profile?.avatar_url ?? `https://api.dicebear.com/8.x/avataaars/svg?seed=${req.profile?.name}`} alt="" className="w-full h-full object-cover" />
                </div>
                <span className="text-xs font-semibold text-gray-700 flex-1 truncate">{req.profile?.name}</span>
                <button onClick={() => onAccept?.(event.id, req.profile_id)} className="text-xs font-bold text-white bg-green-500 hover:bg-green-600 px-2.5 py-1 rounded-lg transition-colors">✓</button>
                <button onClick={() => onReject?.(event.id, req.profile_id)} className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors">✕</button>
              </div>
            ))}
          </div>
        )}
        {isCreator && (
          <a href={`/events/${event.id}/chat`} className="mt-3 block text-center text-xs font-semibold text-primary-600 bg-primary-50 rounded-xl py-2">
            💬 Chat du groupe
          </a>
        )}

        {/* Score section — past events */}
        {isPast && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            {event.score ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">🏆 Score final</span>
                  {isCreator && (
                    <button onClick={() => { setScoreEdit(true); const [a, b] = event.score!.split(' - '); setScoreA(a ?? ''); setScoreB(b ?? ''); setTeamAName(event.team_a ?? ''); setTeamBName(event.team_b ?? '') }}
                      className="text-xs font-semibold text-gray-400 hover:text-gray-600">Modifier</button>
                  )}
                </div>
                <div className="flex items-center justify-center gap-3 py-2 bg-gray-50 rounded-xl">
                  <div className="flex flex-col items-center gap-0.5 flex-1">
                    <span className="text-xs font-semibold text-gray-500 truncate max-w-[80px]">{event.team_a || 'Équipe A'}</span>
                    <span className="text-2xl font-extrabold text-gray-900">{event.score.split(' - ')[0]}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-300">-</span>
                  <div className="flex flex-col items-center gap-0.5 flex-1">
                    <span className="text-xs font-semibold text-gray-500 truncate max-w-[80px]">{event.team_b || 'Équipe B'}</span>
                    <span className="text-2xl font-extrabold text-gray-900">{event.score.split(' - ')[1]}</span>
                  </div>
                </div>
              </div>
            ) : isCreator && !scoreEdit ? (
              <button onClick={() => setScoreEdit(true)}
                className="w-full text-center text-xs font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-xl py-2 transition-colors">
                🏆 Saisir le score final
              </button>
            ) : !isCreator ? (
              <p className="text-xs text-center text-gray-400">Score non encore renseigné</p>
            ) : null}

            {scoreEdit && (
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input value={teamAName} onChange={e => setTeamAName(e.target.value)}
                    placeholder="Équipe A" maxLength={20}
                    className="flex-1 text-center text-xs font-bold border border-gray-200 rounded-xl py-2 px-2 outline-none focus:border-primary-400 bg-gray-50"
                  />
                  <span className="text-xs text-gray-300 font-bold">vs</span>
                  <input value={teamBName} onChange={e => setTeamBName(e.target.value)}
                    placeholder="Équipe B" maxLength={20}
                    className="flex-1 text-center text-xs font-bold border border-gray-200 rounded-xl py-2 px-2 outline-none focus:border-primary-400 bg-gray-50"
                  />
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <input type="number" min="0" value={scoreA} onChange={e => setScoreA(e.target.value)}
                    placeholder="0"
                    className="w-16 text-center text-xl font-extrabold border-2 border-primary-300 rounded-xl py-2 outline-none focus:border-primary-500"
                  />
                  <span className="text-lg font-bold text-gray-400">-</span>
                  <input type="number" min="0" value={scoreB} onChange={e => setScoreB(e.target.value)}
                    placeholder="0"
                    className="w-16 text-center text-xl font-extrabold border-2 border-primary-300 rounded-xl py-2 outline-none focus:border-primary-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setScoreEdit(false)} className="flex-1 py-2 rounded-xl bg-gray-100 text-xs font-semibold text-gray-600">Annuler</button>
                  <button onClick={submitScore} disabled={savingScore || !scoreA || !scoreB}
                    className="flex-1 py-2 rounded-xl bg-primary-600 text-xs font-bold text-white disabled:opacity-50 transition-colors">
                    {savingScore ? '...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
