'use client'
import { useState, useEffect, useRef, FormEvent } from 'react'
import { Post, Comment, SportEvent, Sport } from '@/types'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { formatRelative } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getStoredUser, getAuthToken } from '@/lib/client-utils'

// ─── TimeAgo ────────────────────────────────────────────────────────────────
function TimeAgo({ date }: { date: string }) {
  const [label, setLabel] = useState('')
  useEffect(() => {
    setLabel(formatRelative(new Date(date), new Date(), { locale: fr }))
  }, [date])
  return <span className="text-xs text-gray-400">{label}</span>
}

// ─── Comments Sheet ──────────────────────────────────────────────────────────
function CommentsSheet({ post, onClose }: { post: Post; onClose: () => void }) {
  const [comments, setComments] = useState<Comment[]>(post.comments ?? [])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/posts/${post.id}/comments`)
      .then((r) => r.json())
      .then((d) => { setComments(d.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [post.id])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  async function submitComment(e: FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    const token = getAuthToken()
    if (!token) { window.location.href = '/login'; return }
    setSending(true)
    const res = await fetch(`/api/posts/${post.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: input.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setComments((prev) => [...prev, data.data])
      setInput('')
    }
    setSending(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" style={{ zIndex: 1100 }} onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl flex flex-col" style={{ zIndex: 1200, maxHeight: '75vh' }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0 border-b border-gray-100">
          <p className="font-bold text-gray-900">Commentaires</p>
          <span className="text-xs text-gray-400">{comments.length}</span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Aucun commentaire. Sois le premier !</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {c.author?.avatar_url ? (
                    <img src={c.author.avatar_url} alt={c.author.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
                      {c.author?.name?.[0] ?? '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 bg-gray-50 rounded-2xl px-3 py-2">
                  <p className="text-xs font-bold text-gray-900 mb-0.5">{c.author?.name ?? 'Utilisateur'}</p>
                  <p className="text-sm text-gray-700">{c.content}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(c.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <form onSubmit={submitComment} className="border-t border-gray-100 px-4 py-3 flex gap-2 flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Écrire un commentaire…"
            className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="w-10 h-10 bg-primary-500 text-white rounded-2xl flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </>
  )
}

// ─── PostCard ────────────────────────────────────────────────────────────────
function PostCard({
  post,
  onLike,
  onComment,
}: {
  post: Post
  onLike: (id: number) => void
  onComment: (post: Post) => void
}) {
  const typeLabels: Record<string, { bg: string; label: string }> = {
    activity:       { bg: 'bg-blue-50 text-blue-600',       label: 'Activité' },
    event:          { bg: 'bg-primary-50 text-primary-600', label: 'Événement' },
    post:           { bg: 'bg-gray-100 text-gray-600',      label: 'Post' },
    achievement:    { bg: 'bg-yellow-50 text-yellow-600',   label: 'Performance' },
    recommendation: { bg: 'bg-purple-50 text-purple-600',   label: 'Conseil' },
  }
  const style = typeLabels[post.type] ?? typeLabels.post

  return (
    <article className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-2 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
          {post.author?.avatar_url ? (
            <img src={post.author.avatar_url} alt={post.author.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400">
              {post.author?.name?.[0] ?? '?'}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <a href={`/users/${post.author_id}`} className="text-sm font-bold text-gray-900 truncate hover:text-primary-600">
              {post.author?.name ?? 'Utilisateur'}
            </a>
            {post.sport && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: post.sport.color + '20', color: post.sport.color }}
              >
                {post.sport.icon} {post.sport.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', style.bg)}>
              {style.label}
            </span>
            <TimeAgo date={post.created_at} />
          </div>
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <p className="px-4 pt-1 pb-2 text-sm text-gray-800 leading-relaxed">{post.content}</p>
      )}

      {/* Media (new multi-media) */}
      {post.media && post.media.length > 0 && (
        <div className={cn('mx-4 mb-2 gap-1', post.media.length === 1 ? '' : 'grid grid-cols-2')}>
          {post.media.map((m, i) => (
            m.type === 'video' ? (
              <video
                key={i}
                src={m.url}
                controls
                className="w-full rounded-2xl object-cover max-h-64"
                style={{ maxHeight: post.media!.length === 1 ? '320px' : '160px' }}
              />
            ) : (
              <div key={i} className={cn('rounded-2xl overflow-hidden', post.media!.length === 1 ? 'h-64' : 'h-40')}>
                <img src={m.url} alt="" className="w-full h-full object-cover" />
              </div>
            )
          ))}
        </div>
      )}
      {/* Legacy single image */}
      {!post.media?.length && post.image_url && (
        <div className="mx-4 mb-2 rounded-2xl overflow-hidden h-48">
          <img src={post.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-4 pt-2 flex items-center gap-4 border-t border-gray-50">
        <button
          onClick={() => onLike(post.id)}
          className={cn(
            'flex items-center gap-1.5 text-sm font-semibold transition-all active:scale-95',
            post.liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
          )}
        >
          <svg
            className="w-5 h-5"
            fill={post.liked ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={post.liked ? 0 : 1.8}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {post.likes}
        </button>

        <button
          onClick={() => onComment(post)}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-primary-500 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {post.comments_count}
        </button>
      </div>
    </article>
  )
}

// ─── Composer ────────────────────────────────────────────────────────────────
function PostComposer({ sports, onPosted }: { sports: Sport[]; onPosted: (post: Post) => void }) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [sportId, setSportId] = useState<number | null>(null)
  const [posting, setPosting] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [previews, setPreviews] = useState<Array<{ url: string; type: 'image' | 'video'; serverUrl?: string }>>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const user = getStoredUser()

  function resetForm() {
    setContent('')
    setSportId(null)
    setPreviews([])
    setUploadError('')
    setOpen(false)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    if (previews.length + files.length > 4) {
      setUploadError('Maximum 4 médias par publication.')
      return
    }
    setUploadError('')
    const token = getAuthToken()
    if (!token) { window.location.href = '/login'; return }

    setUploading(true)
    const newPreviews: typeof previews = []

    for (const file of files) {
      const localUrl = URL.createObjectURL(file)
      const isVideo = file.type.startsWith('video/')
      newPreviews.push({ url: localUrl, type: isVideo ? 'video' : 'image' })
    }
    setPreviews((prev) => [...prev, ...newPreviews])

    // Upload each file
    const uploaded: typeof previews = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const form = new FormData()
      form.append('file', file)
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        })
        if (res.ok) {
          const data = await res.json()
          uploaded.push({ url: newPreviews[i].url, type: data.type, serverUrl: data.url })
        } else {
          const err = await res.json()
          setUploadError(err.error ?? 'Erreur upload')
        }
      } catch {
        setUploadError('Erreur réseau lors de l\'upload.')
      }
    }

    // Replace previews with server URLs where available
    setPreviews((prev) => {
      const next = [...prev]
      for (let i = 0; i < uploaded.length; i++) {
        const idx = prev.findIndex((p) => p.url === uploaded[i].url)
        if (idx !== -1) next[idx] = uploaded[i]
      }
      return next
    })
    setUploading(false)
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeMedia(idx: number) {
    setPreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!content.trim() && previews.length === 0) return
    const token = getAuthToken()
    if (!token) { window.location.href = '/login'; return }

    const media = previews
      .filter((p) => p.serverUrl)
      .map((p) => ({ url: p.serverUrl!, type: p.type }))

    setPosting(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          content: content.trim(),
          sport_id: sportId,
          type: 'post',
          media,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        onPosted(data.data)
        resetForm()
      }
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-4 mb-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
          {user ? (
            <img src={`https://api.dicebear.com/8.x/avataaars/svg?seed=${user.name}`} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-200" />
          )}
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-sm text-gray-400 text-left hover:bg-gray-200 transition-colors"
        >
          Quoi de neuf ?
        </button>
        <button
          onClick={() => { setOpen(true); setTimeout(() => fileInputRef.current?.click(), 100) }}
          className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0"
        >
          <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" style={{ zIndex: 1100 }} onClick={resetForm} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 flex flex-col" style={{ zIndex: 1200, maxHeight: '90vh' }}>
            <div className="flex justify-center mb-3">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <p className="font-bold text-gray-900 mb-3">Créer une publication</p>

            <form onSubmit={submit} className="flex flex-col gap-3 overflow-y-auto flex-1">
              <textarea
                autoFocus
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Partage une activité, un conseil, une recherche de joueurs…"
                rows={3}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
              />

              {/* Media previews */}
              {previews.length > 0 && (
                <div className={cn('gap-2', previews.length > 1 ? 'grid grid-cols-2' : 'flex')}>
                  {previews.map((p, i) => (
                    <div key={i} className="relative rounded-2xl overflow-hidden bg-gray-100" style={{ height: previews.length === 1 ? '200px' : '120px' }}>
                      {p.type === 'video' ? (
                        <video src={p.url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={p.url} alt="" className="w-full h-full object-cover" />
                      )}
                      {/* Upload spinner overlay */}
                      {!p.serverUrl && uploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removeMedia(i)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center text-xs"
                      >✕</button>
                      {/* Type badge */}
                      {p.type === 'video' && (
                        <div className="absolute bottom-1.5 left-1.5 bg-black/50 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-lg">
                          VIDEO
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {uploadError && (
                <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{uploadError}</p>
              )}

              {/* Media add button */}
              {previews.length < 4 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-sm hover:border-primary-300 hover:text-primary-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Ajouter photo / vidéo {previews.length > 0 && `(${previews.length}/4)`}
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Sport selector */}
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                <button type="button" onClick={() => setSportId(null)}
                  className={cn('flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all', sportId === null ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500')}>
                  Général
                </button>
                {sports.map((s) => (
                  <button key={s.id} type="button" onClick={() => setSportId(s.id)}
                    className={cn('flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap', sportId === s.id ? 'text-white' : 'bg-gray-100 text-gray-500')}
                    style={sportId === s.id ? { backgroundColor: s.color } : {}}>
                    {s.icon} {s.name}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={resetForm}
                  className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 text-sm font-semibold">
                  Annuler
                </button>
                <button type="submit"
                  disabled={(!content.trim() && previews.length === 0) || posting || uploading}
                  className="flex-1 py-3 rounded-2xl bg-primary-500 text-white text-sm font-semibold disabled:opacity-40">
                  {posting ? 'Publication…' : uploading ? 'Upload…' : 'Publier'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Nearby events strip ─────────────────────────────────────────────────────
function NearbyEventsStrip({ events }: { events: SportEvent[] }) {
  if (events.length === 0) return null
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2 px-4">
        <h2 className="text-sm font-bold text-gray-900">Événements près de toi</h2>
        <Link href="/events" className="text-xs font-semibold text-primary-600">Voir tout</Link>
      </div>
      <div className="flex gap-3 px-4 overflow-x-auto scrollbar-none pb-1">
        {events.slice(0, 5).map((event) => {
          const spotsLeft = event.max_participants - event.participants_count
          return (
            <Link
              key={event.id}
              href="/events"
              className="flex-shrink-0 w-44 bg-white rounded-2xl shadow-card border border-gray-100 p-3 hover:shadow-card-hover transition-all active:scale-[0.97]"
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-lg mb-2"
                style={{ backgroundColor: (event.sport?.color ?? '#22c55e') + '20' }}
              >
                {event.sport?.icon ?? '🏅'}
              </div>
              <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug mb-1">{event.title}</p>
              <p className="text-[10px] text-gray-400">
                {spotsLeft > 0 ? `${spotsLeft} place${spotsLeft > 1 ? 's' : ''}` : 'Complet'}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ─── Quick actions ───────────────────────────────────────────────────────────
function QuickActions() {
  const actions = [
    { href: '/matches', icon: '⚽', label: 'Matchs',   color: 'bg-green-50' },
    { href: '/map',     icon: '🗺️', label: 'Carte',    color: 'bg-blue-50' },
    { href: '/expert',  icon: '📚', label: 'Conseils', color: 'bg-purple-50' },
    { href: '/coaches', icon: '🏅', label: 'Coachs',   color: 'bg-yellow-50' },
  ]
  return (
    <div className="grid grid-cols-4 gap-3 px-4 mb-5">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className={cn('flex flex-col items-center gap-1.5 py-3 rounded-2xl', a.color, 'hover:opacity-80 transition-opacity active:scale-95')}
        >
          <span className="text-2xl">{a.icon}</span>
          <span className="text-[10px] font-semibold text-gray-600">{a.label}</span>
        </Link>
      ))}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [events, setEvents] = useState<SportEvent[]>([])
  const [sports, setSports] = useState<Sport[]>([])
  const [userName, setUserName] = useState('toi')
  const [loading, setLoading] = useState(true)
  const [commentingPost, setCommentingPost] = useState<Post | null>(null)

  useEffect(() => {
    const u = getStoredUser()
    if (u) setUserName(u.name?.split(' ')[0] ?? 'toi')

    // Load in parallel
    Promise.all([
      fetch('/api/posts').then((r) => r.json()),
      fetch('/api/events').then((r) => r.json()),
      fetch('/api/sports').then((r) => r.json()),
    ]).then(([postsRes, eventsRes, sportsRes]) => {
      setPosts((postsRes.data ?? []).map((p: Post) => ({ ...p, liked: false })))
      setEvents(eventsRes.data ?? [])
      setSports(sportsRes.data ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function handleLike(postId: number) {
    const token = getAuthToken()
    if (!token) { window.location.href = '/login'; return }

    // Optimistic
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    )

    const res = await fetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, liked: data.data.liked, likes: data.data.likes } : p
        )
      )
    }
  }

  function handlePostAdded(newPost: Post) {
    setPosts((prev) => [{ ...newPost, liked: false }, ...prev])
  }

  function handleCommentPosted() {
    if (commentingPost) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === commentingPost.id ? { ...p, comments_count: p.comments_count + 1 } : p
        )
      )
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Bonjour,</p>
            <h1 className="text-2xl font-extrabold text-gray-900">{userName} 👋</h1>
          </div>
          <Link
            href="/chat"
            className="relative w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="pt-4">
          <QuickActions />
          <NearbyEventsStrip events={events} />

          {/* Composer */}
          <div className="px-4 mb-1">
            <PostComposer sports={sports} onPosted={handlePostAdded} />
          </div>

          {/* Feed label */}
          <div className="px-4 mb-3 flex items-center gap-2">
            <h2 className="text-sm font-bold text-gray-900">Fil d&apos;actualité</h2>
            <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse-dot" />
          </div>

          {/* Posts */}
          <div className="flex flex-col gap-4 px-4">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-3xl h-48 animate-pulse" />
              ))
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">📝</p>
                <p className="font-bold text-gray-900 mb-1">Aucune publication</p>
                <p className="text-sm text-gray-400">Sois le premier à publier !</p>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={handleLike}
                  onComment={setCommentingPost}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <BottomNav />

      {/* Comments sheet */}
      {commentingPost && (
        <CommentsSheet
          post={commentingPost}
          onClose={() => {
            handleCommentPosted()
            setCommentingPost(null)
          }}
        />
      )}
    </div>
  )
}
