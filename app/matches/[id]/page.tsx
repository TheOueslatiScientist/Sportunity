'use client'
import { useState, useEffect, useRef, FormEvent } from 'react'
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

type Comment = { id: number; author: { id: number; name: string; avatar_url?: string } | null; content: string; created_at: string }

function ParticipantAvatar({ profile, label }: { profile: Profile; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 border-2 border-white shadow-sm">
        <img src={profile.avatar_url ?? `https://api.dicebear.com/8.x/avataaars/svg?seed=${profile.name}`}
          alt={profile.name} className="w-full h-full object-cover" />
      </div>
      <p className="text-[10px] text-gray-600 font-medium text-center leading-tight w-12 truncate">{profile.name.split(' ')[0]}</p>
      {label && <span className="text-[9px] text-gray-400">{label}</span>}
    </div>
  )
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'à l\'instant'
  if (diff < 3600) return `${Math.floor(diff / 60)} min`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`
  return `${Math.floor(diff / 86400)} j`
}

export default function MatchDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const matchId = parseInt(id)

  const [match, setMatch] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  // Score
  const [showScoreForm, setShowScoreForm] = useState(false)
  const [scoreA, setScoreA] = useState('')
  const [scoreB, setScoreB] = useState('')
  const [savingScore, setSavingScore] = useState(false)

  // Comments
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const u = getStoredUser()
    if (u) setCurrentUserId(u.id)
    loadMatch()
    loadComments()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId])

  async function loadMatch() {
    const token = getAuthToken()
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
    const res = await fetch(`/api/matches/${matchId}`, { headers })
    if (res.ok) {
      const data = await res.json()
      const m = data.data
      if (m.score_a != null) { setScoreA(String(m.score_a)); setScoreB(String(m.score_b)) }
      setMatch(m)
    }
    setLoading(false)
  }

  async function loadComments() {
    const res = await fetch(`/api/matches/${matchId}/comments`)
    if (res.ok) {
      const data = await res.json()
      setComments(data.data ?? [])
    }
  }

  async function handleJoin() {
    const token = getAuthToken()
    if (!token) { router.push('/login'); return }
    setJoining(true)
    const res = await fetch(`/api/matches/${matchId}/join`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) await loadMatch()
    setJoining(false)
  }

  async function handleLeave() {
    const token = getAuthToken()
    if (!token) return
    setJoining(true)
    const res = await fetch(`/api/matches/${matchId}/leave`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) await loadMatch()
    setJoining(false)
  }

  async function handleSaveScore(e: FormEvent) {
    e.preventDefault()
    if (scoreA === '' || scoreB === '') return
    setSavingScore(true)
    const token = getAuthToken()
    const res = await fetch(`/api/matches/${matchId}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ score_a: parseInt(scoreA), score_b: parseInt(scoreB) }),
    })
    if (res.ok) {
      await loadMatch()
      setShowScoreForm(false)
    }
    setSavingScore(false)
  }

  async function handlePostComment(e: FormEvent) {
    e.preventDefault()
    if (!commentText.trim()) return
    const token = getAuthToken()
    if (!token) { router.push('/login'); return }
    setPostingComment(true)
    const res = await fetch(`/api/matches/${matchId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: commentText.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setComments((prev) => [...prev, data.data])
      setCommentText('')
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
    setPostingComment(false)
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
  const isParticipant = isJoined || isCreator
  const isCompleted = match.status === 'completed'
  const matchPast = new Date(match.date) < new Date()
  const canEnterScore = isParticipant && (isCompleted || matchPast)
  const hasScore = match.score_a != null && match.score_b != null
  const isFull = match.status === 'full'
  const filled = match.players_count
  const total = match.max_players
  const pct = Math.round((filled / total) * 100)
  const spotsLeft = total - filled

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-white">
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

        <div className="h-1.5 mx-4 rounded-full" style={{ background: match.sport?.color ?? '#22c55e' }} />

        <div className="px-4 py-4">
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

          <div className="bg-gray-50 rounded-2xl p-3 mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-bold text-gray-900">{filled} joueur{filled > 1 ? 's' : ''} inscrit{filled > 1 ? 's' : ''}</span>
              <span className="font-bold text-gray-500">
                {isFull ? <span className="text-red-500">Complet</span> : <span className="text-green-600">{spotsLeft} place{spotsLeft > 1 ? 's' : ''} libre{spotsLeft > 1 ? 's' : ''}</span>}
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

        {/* ── Score ── */}
        {(hasScore || canEnterScore) && (
          <div className="bg-white rounded-3xl p-4 shadow-card border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 text-sm">🏆 Score final</h2>
              {canEnterScore && !showScoreForm && (
                <button onClick={() => setShowScoreForm(true)}
                  className="text-xs text-primary-600 font-semibold hover:underline">
                  {hasScore ? 'Modifier' : 'Entrer le score'}
                </button>
              )}
            </div>

            {hasScore && !showScoreForm && (
              <div className="flex items-center justify-center gap-6 py-3">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1 font-medium">{match.team_a_name ?? 'Équipe A'}</p>
                  <p className="text-5xl font-black text-gray-900">{match.score_a}</p>
                </div>
                <div className="text-2xl font-black text-gray-300">–</div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1 font-medium">{match.team_b_name ?? 'Équipe B'}</p>
                  <p className="text-5xl font-black text-gray-900">{match.score_b}</p>
                </div>
              </div>
            )}

            {!hasScore && !showScoreForm && canEnterScore && (
              <p className="text-sm text-gray-400 text-center py-2">Aucun score enregistré</p>
            )}

            {showScoreForm && (
              <form onSubmit={handleSaveScore} className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <div className="flex-1 text-center">
                    <label className="text-xs text-gray-500 font-medium block mb-1">{match.team_a_name ?? 'Équipe A'}</label>
                    <input type="number" min="0" max="99" value={scoreA}
                      onChange={(e) => setScoreA(e.target.value)}
                      className="w-full text-center text-3xl font-black rounded-2xl border border-gray-200 bg-gray-50 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
                  </div>
                  <span className="text-xl font-black text-gray-300">–</span>
                  <div className="flex-1 text-center">
                    <label className="text-xs text-gray-500 font-medium block mb-1">{match.team_b_name ?? 'Équipe B'}</label>
                    <input type="number" min="0" max="99" value={scoreB}
                      onChange={(e) => setScoreB(e.target.value)}
                      className="w-full text-center text-3xl font-black rounded-2xl border border-gray-200 bg-gray-50 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowScoreForm(false)}
                    className="flex-1 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600">
                    Annuler
                  </button>
                  <Button type="submit" loading={savingScore} className="flex-1">
                    Enregistrer
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Description */}
        {match.description && (
          <div className="bg-white rounded-3xl p-4 shadow-card border border-gray-100">
            <h2 className="font-bold text-gray-900 mb-2 text-sm">À propos</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{match.description}</p>
          </div>
        )}

        {/* Participants */}
        {(match.participants ?? []).length > 0 && (
          <div className="bg-white rounded-3xl p-4 shadow-card border border-gray-100">
            <h2 className="font-bold text-gray-900 mb-4 text-sm">Participants ({filled}/{total})</h2>
            <div className="flex flex-wrap gap-3">
              {(match.participants ?? []).map((p: Profile, i: number) => (
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
        )}

        {/* Organizer */}
        {match.creator && (
          <div className="bg-white rounded-3xl p-4 shadow-card border border-gray-100">
            <h2 className="font-bold text-gray-900 mb-3 text-sm">Organisateur</h2>
            <Link href={`/users/${match.creator_id}`} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                <img src={match.creator.avatar_url ?? `https://api.dicebear.com/8.x/avataaars/svg?seed=${match.creator.name}`}
                  alt={match.creator.name} className="w-full h-full object-cover" />
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

        {/* ── Comments ── */}
        <div className="bg-white rounded-3xl p-4 shadow-card border border-gray-100">
          <h2 className="font-bold text-gray-900 mb-4 text-sm">
            💬 Commentaires {comments.length > 0 && <span className="text-gray-400 font-normal">({comments.length})</span>}
          </h2>

          {comments.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-3">Aucun commentaire pour l&apos;instant.</p>
          )}

          <div className="flex flex-col gap-3 mb-4">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  <img src={c.author?.avatar_url ?? `https://api.dicebear.com/8.x/avataaars/svg?seed=${c.author?.name}`}
                    alt={c.author?.name ?? '?'} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold text-gray-900">{c.author?.name ?? 'Utilisateur'}</span>
                    <span className="text-[10px] text-gray-400">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{c.content}</p>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>

          <form onSubmit={handlePostComment} className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Écrire un commentaire…"
              className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            />
            <button type="submit" disabled={!commentText.trim() || postingComment}
              className={cn('w-10 h-10 rounded-2xl flex items-center justify-center transition-all flex-shrink-0',
                commentText.trim() ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-300')}>
              {postingComment ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Fixed CTA */}
      {!isCreator && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4" style={{ zIndex: 900 }}>
          {isJoined ? (
            <div className="flex gap-3">
              <Button fullWidth variant="secondary" loading={joining} onClick={handleLeave}>
                Quitter le match
              </Button>
              <Link href={`/matches/${matchId}/chat`} className="flex-1">
                <Button fullWidth>💬 Groupe</Button>
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
