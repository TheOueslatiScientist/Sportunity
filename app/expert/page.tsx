'use client'
import { useState, useEffect, useRef, FormEvent } from 'react'
import { ExpertPost, ExpertComment, Sport } from '@/types'
import BottomNav from '@/components/BottomNav'
import { cn } from '@/lib/utils'
import { getStoredUser, getAuthToken } from '@/lib/client-utils'
import { formatRelative } from 'date-fns'
import { fr } from 'date-fns/locale'

type ExpertCategory = 'training' | 'recovery' | 'nutrition' | 'technique'

const CATEGORIES: { value: ExpertCategory | 'all'; label: string; icon: string; color: string }[] = [
  { value: 'all',       label: 'Tous',           icon: '📚', color: '#6b7280' },
  { value: 'training',  label: 'Entraînement',   icon: '💪', color: '#ef4444' },
  { value: 'recovery',  label: 'Récupération',   icon: '🧘', color: '#8b5cf6' },
  { value: 'nutrition', label: 'Nutrition',      icon: '🥗', color: '#22c55e' },
  { value: 'technique', label: 'Technique',      icon: '🎯', color: '#f97316' },
]

const ROLE_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  coach:  { label: '🏅 Coach',  bg: 'bg-blue-50',   text: 'text-blue-700' },
  expert: { label: '⭐ Expert', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  user:   { label: '👤 Membre', bg: 'bg-gray-100',  text: 'text-gray-600' },
}

function TimeAgo({ date }: { date: string }) {
  const [label, setLabel] = useState('')
  useEffect(() => {
    setLabel(formatRelative(new Date(date), new Date(), { locale: fr }))
  }, [date])
  return <span className="text-xs text-gray-400">{label}</span>
}

// ─── Comment Sheet ─────────────────────────────────────────────────────────────
function CommentsSheet({ post, onClose }: { post: ExpertPost; onClose: () => void }) {
  const [comments, setComments] = useState<ExpertComment[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/expert-posts/${post.id}/comments`)
      .then((r) => r.json())
      .then((d) => { setComments(d.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [post.id])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    const token = getAuthToken()
    if (!token) { window.location.href = '/login'; return }
    setSending(true)
    const res = await fetch(`/api/expert-posts/${post.id}/comments`, {
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
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0 border-b border-gray-100">
          <p className="font-bold text-gray-900">Commentaires</p>
          <span className="text-xs text-gray-400">{comments.length}</span>
        </div>
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
                  {c.author?.avatar_url
                    ? <img src={c.author.avatar_url} alt={c.author.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">{c.author?.name?.[0] ?? '?'}</div>
                  }
                </div>
                <div className="flex-1 bg-gray-50 rounded-2xl px-3 py-2">
                  <p className="text-xs font-bold text-gray-900 mb-0.5">{c.author?.name ?? 'Utilisateur'}</p>
                  <p className="text-sm text-gray-700">{c.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
        <form onSubmit={submit} className="border-t border-gray-100 px-4 py-3 flex gap-2 flex-shrink-0">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Écrire un commentaire…"
            className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
          <button type="submit" disabled={!input.trim() || sending}
            className="w-10 h-10 bg-primary-500 text-white rounded-2xl flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </>
  )
}

// ─── Expert Post Card ──────────────────────────────────────────────────────────
function ExpertCard({
  post,
  onLike,
  onSave,
  onComment,
}: {
  post: ExpertPost
  onLike: (id: number) => void
  onSave: (id: number) => void
  onComment: (post: ExpertPost) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const cat = CATEGORIES.find((c) => c.value === post.category)
  const roleBadge = ROLE_BADGES[post.author?.role ?? 'user'] ?? ROLE_BADGES.user

  const paragraphs = post.content.split('\n\n').filter(Boolean)

  function renderContent(text: string) {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-bold text-gray-900 mt-2 mb-1">{line.slice(2, -2)}</p>
      }
      if (line.startsWith('- ')) {
        return <p key={i} className="text-gray-700 pl-3">• {line.slice(2)}</p>
      }
      return <p key={i} className="text-gray-700">{line}</p>
    })
  }

  return (
    <article className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden">
      {/* Category accent */}
      <div className="h-1 w-full" style={{ backgroundColor: cat?.color ?? '#6b7280' }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
            {post.author?.avatar_url
              ? <img src={post.author.avatar_url} alt={post.author.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400">{post.author?.name?.[0] ?? '?'}</div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-gray-900">{post.author?.name ?? 'Expert'}</span>
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', roleBadge.bg, roleBadge.text)}>
                {roleBadge.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: (cat?.color ?? '#6b7280') + '20', color: cat?.color ?? '#6b7280' }}>
                {cat?.icon} {cat?.label}
              </span>
              {post.read_time && (
                <span className="text-[10px] text-gray-400">📖 {post.read_time} min</span>
              )}
              <TimeAgo date={post.created_at} />
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="font-extrabold text-gray-900 text-base leading-snug mb-2">{post.title}</h2>

        {/* Content */}
        <div className="text-sm leading-relaxed">
          {expanded ? (
            <div className="flex flex-col gap-1">
              {paragraphs.map((p, i) => (
                <div key={i}>{renderContent(p)}</div>
              ))}
              <button onClick={() => setExpanded(false)} className="text-primary-500 text-xs font-semibold mt-2">
                Voir moins ↑
              </button>
            </div>
          ) : (
            <>
              <p className="text-gray-600 line-clamp-3">{post.excerpt ?? post.content.slice(0, 120)}</p>
              <button onClick={() => setExpanded(true)} className="text-primary-500 text-xs font-semibold mt-1">
                Lire l&apos;article complet →
              </button>
            </>
          )}
        </div>

        {/* Sport tag */}
        {post.sport && (
          <div className="mt-3">
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: post.sport.color + '20', color: post.sport.color }}>
              {post.sport.icon} {post.sport.name}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-50">
          <button onClick={() => onLike(post.id)}
            className={cn('flex items-center gap-1.5 text-sm font-semibold transition-all active:scale-95',
              post.liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400')}>
            <svg className="w-5 h-5" fill={post.liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={post.liked ? 0 : 1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {post.likes}
          </button>

          <button onClick={() => onComment(post)}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-primary-500 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {post.comments_count}
          </button>

          <button onClick={() => onSave(post.id)} className="ml-auto">
            <svg className={cn('w-5 h-5 transition-colors', post.saved ? 'text-primary-500 fill-primary-500' : 'text-gray-400')}
              viewBox="0 0 24 24" fill={post.saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  )
}

// ─── New Post Sheet ───────────────────────────────────────────────────────────
function NewPostSheet({ onClose, onPosted }: { onClose: () => void; onPosted: (p: ExpertPost) => void }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<ExpertCategory>('training')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  const user = getStoredUser()
  const isExpertOrCoach = user?.role === 'coach' || user?.role === 'expert'

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) { setError('Titre et contenu requis.'); return }
    const token = getAuthToken()
    if (!token) { window.location.href = '/login'; return }
    setPosting(true)
    const res = await fetch('/api/expert-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: title.trim(), content: content.trim(), category }),
    })
    if (res.ok) {
      const data = await res.json()
      onPosted(data.data)
      onClose()
    } else {
      const err = await res.json()
      setError(err.error ?? 'Erreur')
    }
    setPosting(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" style={{ zIndex: 1100 }} onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl flex flex-col" style={{ zIndex: 1200, maxHeight: '90vh' }}>
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0 border-b border-gray-100">
          <p className="font-bold text-gray-900">Publier un article expert</p>
          <button onClick={onClose} className="text-gray-400 text-lg">✕</button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {/* Category */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Catégorie *</p>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                <button key={c.value} type="button" onClick={() => setCategory(c.value as ExpertCategory)}
                  className={cn('px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all',
                    category === c.value ? 'text-white' : 'bg-gray-100 text-gray-600')}
                  style={category === c.value ? { backgroundColor: c.color } : {}}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Titre *</p>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="ex : 5 exercices pour progresser au football"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Contenu *</p>
            <p className="text-[10px] text-gray-400 mb-1.5">Utilisez **texte** pour mettre en gras, et des sauts de ligne pour structurer.</p>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8}
              placeholder="Partagez votre expertise ici…"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none" />
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          <div className="flex gap-3 pb-4">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 text-sm font-semibold">Annuler</button>
            <button type="submit" disabled={!title.trim() || !content.trim() || posting}
              className="flex-1 py-3 rounded-2xl bg-primary-500 text-white text-sm font-semibold disabled:opacity-40">
              {posting ? 'Publication…' : 'Publier l\'article'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ExpertPage() {
  const [posts, setPosts] = useState<ExpertPost[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<ExpertCategory | 'all'>('all')
  const [commentingPost, setCommentingPost] = useState<ExpertPost | null>(null)
  const [showNewPost, setShowNewPost] = useState(false)
  const [currentUser] = useState(() => typeof window !== 'undefined' ? getStoredUser() : null)

  useEffect(() => {
    loadPosts()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  async function loadPosts() {
    setLoading(true)
    const token = getAuthToken()
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
    const catParam = category !== 'all' ? `?category=${category}` : ''
    const res = await fetch(`/api/expert-posts${catParam}`, { headers })
    if (res.ok) {
      const data = await res.json()
      setPosts(data.data ?? [])
    }
    setLoading(false)
  }

  async function handleLike(postId: number) {
    const token = getAuthToken()
    if (!token) { window.location.href = '/login'; return }
    setPosts((prev) => prev.map((p) => p.id === postId
      ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
      : p))
    const res = await fetch(`/api/expert-posts/${postId}/like`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, ...data.data } : p))
    }
  }

  async function handleSave(postId: number) {
    const token = getAuthToken()
    if (!token) { window.location.href = '/login'; return }
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, saved: !p.saved } : p))
    await fetch(`/api/expert-posts/${postId}/save`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    })
  }

  const isExpertOrCoach = currentUser?.role === 'coach' || currentUser?.role === 'expert'

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Conseils Sport</h1>
            <p className="text-xs text-gray-400">Articles d&apos;experts MEL</p>
          </div>
          {(isExpertOrCoach) && (
            <button onClick={() => setShowNewPost(true)}
              className="flex items-center gap-1.5 bg-primary-500 text-white px-3 py-2 rounded-2xl text-xs font-bold shadow-sm shadow-primary-500/30 active:scale-95 transition-transform">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Écrire
            </button>
          )}
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              className={cn('px-3 py-1.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1',
                category === c.value ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
              style={category === c.value ? { backgroundColor: c.color } : {}}>
              {c.icon} {c.label}
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
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">📚</p>
            <p className="font-bold text-gray-900 text-lg mb-2">Aucun article</p>
            <p className="text-sm text-gray-500">Sois le premier à partager ton expertise !</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-gray-400 font-medium">{posts.length} article{posts.length > 1 ? 's' : ''}</p>
            {posts.map((post) => (
              <ExpertCard
                key={post.id} post={post}
                onLike={handleLike} onSave={handleSave} onComment={setCommentingPost}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />

      {commentingPost && (
        <CommentsSheet post={commentingPost} onClose={() => setCommentingPost(null)} />
      )}

      {showNewPost && (
        <NewPostSheet
          onClose={() => setShowNewPost(false)}
          onPosted={(p) => setPosts((prev) => [p, ...prev])}
        />
      )}
    </div>
  )
}
