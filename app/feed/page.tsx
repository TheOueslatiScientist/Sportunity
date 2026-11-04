'use client'
import { useState, useEffect, useRef, FormEvent } from 'react'
import { Post, Comment, SportEvent, Sport } from '@/types'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { formatRelative } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getStoredUser, getAuthToken } from '@/lib/client-utils'

function TimeAgo({ date }: { date: string }) {
  const [label, setLabel] = useState('')
  useEffect(() => {
    setLabel(formatRelative(new Date(date), new Date(), { locale: fr }))
  }, [date])
  return <span className="text-xs text-gray-400">{label}</span>
}

function Avatar({ name, url, size = 'md' }: { name?: string; url?: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10'
  const txt = size === 'sm' ? 'text-xs' : 'text-sm'
  if (url) return <img src={url} alt={name} className={cn(dim, 'rounded-2xl object-cover flex-shrink-0')} />
  return (
    <div className={cn(dim, 'rounded-2xl bg-primary-100 flex items-center justify-center flex-shrink-0', txt, 'font-bold text-primary-700')}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
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

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [comments])

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
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0 border-b border-gray-100">
          <p className="font-bold text-gray-900">Commentaires</p>
          <span className="text-xs text-gray-400">{comments.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Aucun commentaire. Sois le premier !</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar name={c.author?.name} url={c.author?.avatar_url} size="sm" />
                <div className="flex-1 bg-gray-50 rounded-2xl px-3 py-2">
                  <p className="text-xs font-bold text-gray-900 mb-0.5">{c.author?.name ?? 'Utilisateur'}</p>
                  <p className="text-sm text-gray-700">{c.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
        <form onSubmit={submitComment} className="border-t border-gray-100 px-5 py-3 flex gap-2 flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Écrire un commentaire…"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="w-10 h-10 bg-primary-800 text-white rounded-2xl flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
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
function PostCard({ post, onLike, onComment }: { post: Post; onLike: (id: number) => void; onComment: (post: Post) => void }) {
  return (
    <article className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="p-4 pb-3 flex items-center gap-3">
        <Avatar name={post.author?.name} url={post.author?.avatar_url} />
        <div className="flex-1 min-w-0">
          <a href={`/users/${post.author_id}`} className="text-sm font-bold text-gray-900 hover:text-primary-700">
            {post.author?.name ?? 'Utilisateur'}
          </a>
          <div className="flex items-center gap-1.5 mt-0.5">
            <TimeAgo date={post.created_at} />
            {post.sport && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {post.sport.name}
              </span>
            )}
          </div>
        </div>
        <button className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-gray-500">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      {post.content && (
        <p className="px-4 pb-3 text-sm text-gray-800 leading-relaxed">{post.content}</p>
      )}

      {post.media && post.media.length > 0 && (
        <div className={cn('mx-4 mb-3 gap-1', post.media.length > 1 ? 'grid grid-cols-2' : '')}>
          {post.media.map((m, i) =>
            m.type === 'video' ? (
              <video key={i} src={m.url} controls className="w-full rounded-xl object-cover max-h-64" />
            ) : (
              <div key={i} className={cn('rounded-xl overflow-hidden', post.media!.length === 1 ? 'h-56' : 'h-36')}>
                <img src={m.url} alt="" className="w-full h-full object-cover" />
              </div>
            )
          )}
        </div>
      )}
      {!post.media?.length && post.image_url && (
        <div className="mx-4 mb-3 rounded-xl overflow-hidden h-48">
          <img src={post.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="px-4 pb-4 pt-2 flex items-center gap-5 border-t border-gray-50">
        <button
          onClick={() => onLike(post.id)}
          className={cn('flex items-center gap-1.5 text-sm font-semibold transition-all active:scale-95', post.liked ? 'text-red-500' : 'text-gray-400')}
        >
          <svg className="w-5 h-5" fill={post.liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={post.liked ? 0 : 1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {post.likes}
        </button>
        <button
          onClick={() => onComment(post)}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-primary-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {post.comments_count}
        </button>
        <div className="flex-1" />
        <button className="text-gray-300 hover:text-gray-500 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>
    </article>
  )
}

// ─── Composer trigger ────────────────────────────────────────────────────────
function PostComposer({ sports, onPosted }: { sports: Sport[]; onPosted: (post: Post) => void }) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [sportId, setSportId] = useState<number | null>(null)
  const [posting, setPosting] = useState(false)
  const [previews, setPreviews] = useState<Array<{ url: string; type: 'image' | 'video'; serverUrl?: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const user = getStoredUser()

  function resetForm() { setContent(''); setSportId(null); setPreviews([]); setUploadError(''); setOpen(false) }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    if (previews.length + files.length > 4) { setUploadError('Maximum 4 médias.'); return }
    setUploadError('')
    const token = getAuthToken()
    if (!token) { window.location.href = '/login'; return }
    setUploading(true)
    const newPreviews = files.map((f) => ({ url: URL.createObjectURL(f), type: (f.type.startsWith('video/') ? 'video' : 'image') as 'image' | 'video' }))
    setPreviews((prev) => [...prev, ...newPreviews])
    const uploaded: typeof previews = []
    for (let i = 0; i < files.length; i++) {
      const form = new FormData(); form.append('file', files[i])
      try {
        const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
        if (res.ok) { const d = await res.json(); uploaded.push({ url: newPreviews[i].url, type: d.type, serverUrl: d.url }) }
        else { const err = await res.json(); setUploadError(err.error ?? 'Erreur upload') }
      } catch { setUploadError('Erreur réseau.') }
    }
    setPreviews((prev) => {
      const next = [...prev]
      uploaded.forEach((u) => { const idx = prev.findIndex((p) => p.url === u.url); if (idx !== -1) next[idx] = u })
      return next
    })
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!content.trim() && previews.length === 0) return
    const token = getAuthToken()
    if (!token) { window.location.href = '/login'; return }
    const media = previews.filter((p) => p.serverUrl).map((p) => ({ url: p.serverUrl!, type: p.type }))
    setPosting(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: content.trim(), sport_id: sportId, type: 'post', media }),
      })
      if (res.ok) { const d = await res.json(); onPosted(d.data); resetForm() }
    } finally { setPosting(false) }
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 p-3 flex items-center gap-3 shadow-sm">
        <Avatar name={user?.name} url={user ? `https://api.dicebear.com/8.x/avataaars/svg?seed=${user.name}` : undefined} size="sm" />
        <button onClick={() => setOpen(true)} className="flex-1 bg-gray-50 rounded-xl px-4 py-2 text-sm text-gray-400 text-left border border-gray-100">
          Quoi de neuf ?
        </button>
        <button onClick={() => { setOpen(true); setTimeout(() => fileInputRef.current?.click(), 100) }}
          className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" style={{ zIndex: 1100 }} onClick={resetForm} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 flex flex-col" style={{ zIndex: 1200, maxHeight: '90vh' }}>
            <div className="flex justify-center mb-4"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
            <p className="font-bold text-gray-900 mb-4 text-base">Créer une publication</p>
            <form onSubmit={submit} className="flex flex-col gap-3 overflow-y-auto flex-1">
              <textarea autoFocus value={content} onChange={(e) => setContent(e.target.value)}
                placeholder="Partage une activité, un conseil, une recherche de joueurs…" rows={3}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700 resize-none" />
              {previews.length > 0 && (
                <div className={cn('gap-2', previews.length > 1 ? 'grid grid-cols-2' : 'flex')}>
                  {previews.map((p, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden bg-gray-100" style={{ height: previews.length === 1 ? '200px' : '120px' }}>
                      {p.type === 'video' ? <video src={p.url} className="w-full h-full object-cover" /> : <img src={p.url} alt="" className="w-full h-full object-cover" />}
                      {!p.serverUrl && uploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
                      <button type="button" onClick={() => setPreviews((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center text-xs">✕</button>
                    </div>
                  ))}
                </div>
              )}
              {uploadError && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{uploadError}</p>}
              {previews.length < 4 && (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm hover:border-primary-300 hover:text-primary-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Ajouter photo / vidéo {previews.length > 0 && `(${previews.length}/4)`}
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileChange} />
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                <button type="button" onClick={() => setSportId(null)}
                  className={cn('flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all', sportId === null ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500')}>
                  Général
                </button>
                {sports.map((s) => (
                  <button key={s.id} type="button" onClick={() => setSportId(s.id)}
                    className={cn('flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap', sportId === s.id ? 'bg-primary-800 text-white' : 'bg-gray-100 text-gray-500')}>
                    {s.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={resetForm} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold">Annuler</button>
                <button type="submit" disabled={(!content.trim() && previews.length === 0) || posting || uploading}
                  className="flex-1 py-3 rounded-xl bg-primary-800 text-white text-sm font-bold disabled:opacity-40">
                  {posting ? 'Publication…' : uploading ? 'Upload…' : 'Publier'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  )
}

// ─── Events strip ────────────────────────────────────────────────────────────
function EventsStrip({ events }: { events: SportEvent[] }) {
  if (events.length === 0) return null
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3 px-4">
        <h2 className="text-base font-extrabold text-gray-900">Événements à venir</h2>
        <Link href="/events" className="text-xs font-semibold text-primary-700">Voir tout →</Link>
      </div>
      <div className="flex gap-3 px-4 overflow-x-auto scrollbar-none pb-1">
        {events.slice(0, 6).map((event) => {
          const spotsLeft = event.max_participants - event.participants_count
          return (
            <Link key={event.id} href="/events"
              className="flex-shrink-0 w-56 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm active:scale-[0.97] transition-transform">
              <div className="h-28 bg-gray-100 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center">
                  <svg className="w-10 h-10 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="absolute top-2 left-2 bg-primary-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {event.sport?.name ?? 'Sport'}
                </span>
              </div>
              <div className="p-3">
                <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug mb-2">{event.title}</p>
                <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {event.participants_count}/{event.max_participants}
                  </span>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', spotsLeft > 0 ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-400')}>
                    {spotsLeft > 0 ? 'Rejoindre' : 'Complet'}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ─── Quick actions ────────────────────────────────────────────────────────────
function QuickActions() {
  const actions = [
    {
      href: '/events/new', label: 'Créer un événement',
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    },
    {
      href: '/coaches', label: 'Trouver un coach',
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    },
    {
      href: '/map', label: 'Explorer les infrastructures',
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    },
    {
      href: '/feed', label: 'Publier',
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
    },
  ]
  return (
    <div className="grid grid-cols-4 gap-3 px-4 mb-5">
      {actions.map((a) => (
        <Link key={a.href} href={a.href}
          className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:border-primary-200 active:scale-95 transition-all">
          <span className="text-primary-700">{a.icon}</span>
          <span className="text-[9px] font-semibold text-gray-600 text-center leading-tight px-1">{a.label}</span>
        </Link>
      ))}
    </div>
  )
}

// ─── Hero banner ────────────────────────────────────────────────────────────
function HeroBanner() {
  return (
    <div className="mx-4 mb-5 rounded-2xl overflow-hidden relative h-44">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-600" />
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
      <div className="relative h-full flex flex-col justify-end p-5">
        <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Découvre · Partage · Pratique</p>
        <h2 className="text-white text-2xl font-extrabold leading-tight mb-3">
          Le sport plus proche<br />
          <span className="text-primary-300">de toi.</span>
        </h2>
        <Link href="/map"
          className="inline-flex items-center gap-2 bg-white text-primary-900 text-xs font-bold px-4 py-2 rounded-full w-fit">
          Explorer la carte
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}

// ─── Sport filter pills ──────────────────────────────────────────────────────
function SportFilter({ sports, active, onChange }: { sports: Sport[]; active: number | null; onChange: (id: number | null) => void }) {
  return (
    <div className="flex gap-2 px-4 mb-4 overflow-x-auto scrollbar-none">
      <button onClick={() => onChange(null)}
        className={cn('flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all border',
          active === null ? 'bg-primary-800 text-white border-primary-800' : 'bg-white text-gray-500 border-gray-200')}>
        Tous
      </button>
      {sports.map((s) => (
        <button key={s.id} onClick={() => onChange(s.id)}
          className={cn('flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap',
            active === s.id ? 'bg-primary-800 text-white border-primary-800' : 'bg-white text-gray-500 border-gray-200')}>
          {s.name}
        </button>
      ))}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [events, setEvents] = useState<SportEvent[]>([])
  const [sports, setSports] = useState<Sport[]>([])
  const [userName, setUserName] = useState('')
  const [userAvatar, setUserAvatar] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [commentingPost, setCommentingPost] = useState<Post | null>(null)
  const [sportFilter, setSportFilter] = useState<number | null>(null)

  useEffect(() => {
    const u = getStoredUser()
    if (u) {
      setUserName(u.name ?? '')
      setUserAvatar(`https://api.dicebear.com/8.x/avataaars/svg?seed=${u.name}`)
    }
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
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p))
    const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) {
      const d = await res.json()
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, liked: d.data.liked, likes: d.data.likes } : p))
    }
  }

  const filteredPosts = sportFilter ? posts.filter((p) => p.sport_id === sportFilter) : posts

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-800 flex items-center justify-center">
              <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none">
                <path d="M6 26 C6 26 8 14 16 10 C24 6 28 10 26 18 C24 24 18 28 12 26 C10 25 8 22 10 18 C12 14 18 14 20 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
            <span className="text-lg font-extrabold text-gray-900 tracking-tight">Sportunity</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ width: '18px', height: '18px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            {userAvatar && (
              <Link href="/profile" className="w-9 h-9 rounded-xl overflow-hidden border border-gray-100">
                <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
              </Link>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="mt-3 flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-sm text-gray-400">Rechercher sur Sportunity...</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="pt-5">
          <QuickActions />
          <HeroBanner />
          <EventsStrip events={events} />

          <div className="px-4 mb-3 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-gray-900">Fil d&apos;actualité</h2>
          </div>

          <SportFilter sports={sports} active={sportFilter} onChange={setSportFilter} />

          <div className="px-4 mb-4">
            <PostComposer sports={sports} onPosted={(p) => setPosts((prev) => [{ ...p, liked: false }, ...prev])} />
          </div>

          <div className="flex flex-col gap-3 px-4">
            {loading ? (
              [1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl h-48 animate-pulse border border-gray-100" />)
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <p className="font-bold text-gray-900 mb-1">Aucune publication</p>
                <p className="text-sm text-gray-400">Sois le premier à publier !</p>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} onLike={handleLike} onComment={setCommentingPost} />
              ))
            )}
          </div>
        </div>
      </div>

      <BottomNav />

      {commentingPost && (
        <CommentsSheet
          post={commentingPost}
          onClose={() => {
            if (commentingPost) setPosts((prev) => prev.map((p) => p.id === commentingPost.id ? { ...p, comments_count: p.comments_count + 1 } : p))
            setCommentingPost(null)
          }}
        />
      )}
    </div>
  )
}
