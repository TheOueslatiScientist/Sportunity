'use client'
import { useState, useEffect, useRef, FormEvent, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Conversation, Message, Profile } from '@/types'
import BottomNav from '@/components/BottomNav'
import { cn } from '@/lib/utils'
import { getStoredUser, getAuthToken } from '@/lib/client-utils'

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function convTimeLabel(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  if (now.getTime() - d.getTime() < 7 * 86400000)
    return d.toLocaleDateString('fr-FR', { weekday: 'short' })
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
function dateLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function Avatar({ name, url, size = 48 }: { name?: string; url?: string | null; size?: number }) {
  const initials = name?.[0]?.toUpperCase() ?? '?'
  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']
  const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length]
  if (url) return <img src={url} alt={name ?? ''} style={{ width: size, height: size }} className="rounded-full object-cover flex-shrink-0" />
  return (
    <div style={{ width: size, height: size, background: color + '22', border: `2px solid ${color}33` }}
      className="rounded-full flex items-center justify-center flex-shrink-0">
      <span style={{ color, fontSize: size * 0.4, fontWeight: 700 }}>{initials}</span>
    </div>
  )
}

function ChatPageInner() {
  const searchParams = useSearchParams()
  const preselectedUserId = searchParams.get('user') ?? searchParams.get('userId')

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [currentUserName, setCurrentUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [view, setView] = useState<'list' | 'chat'>('list')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeProfileRef = useRef<Profile | null>(null)

  useEffect(() => {
    const user = getStoredUser()
    if (user) { setCurrentUserId(user.id); setCurrentUserName(user.name ?? '') }
  }, [])

  const loadConversations = useCallback(async () => {
    const token = getAuthToken()
    if (!token) return
    try {
      const res = await fetch('/api/conversations', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const data = await res.json(); setConversations(data.data ?? []) }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const init = async () => { setLoading(true); await loadConversations(); setLoading(false) }
    init()
  }, [loadConversations])

  useEffect(() => {
    if (view === 'chat') setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [messages, view])

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const loadMessages = useCallback(async (otherUserId: number, silent = false) => {
    const token = getAuthToken()
    if (!token) return
    try {
      const res = await fetch(`/api/messages/${otherUserId}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const data = await res.json(); setMessages(data.data ?? []) }
    } catch { /* ignore */ }
  }, [])

  const openConversation = useCallback(async (profile: Profile) => {
    setActiveProfile(profile)
    activeProfileRef.current = profile
    setMessages([])
    setView('chat')
    await loadMessages(profile.user_id)
    setTimeout(() => inputRef.current?.focus(), 300)
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => {
      if (activeProfileRef.current) loadMessages(activeProfileRef.current.user_id, true)
    }, 3000)
  }, [loadMessages])

  function closeConversation() {
    if (pollRef.current) clearInterval(pollRef.current)
    activeProfileRef.current = null
    setActiveProfile(null)
    setMessages([])
    setView('list')
    loadConversations()
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault()
    if (!input.trim() || !activeProfile || sending) return
    const token = getAuthToken()
    if (!token) return
    const text = input.trim()
    setInput('')
    setSending(true)
    const tempMsg: Message = {
      id: Date.now(), sender_id: currentUserId!, receiver_id: activeProfile.user_id,
      content: text, read: false, created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempMsg])
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiver_id: activeProfile.user_id, content: text }),
      })
      await loadMessages(activeProfile.user_id, true)
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    if (!preselectedUserId || loading) return
    const token = getAuthToken()
    if (!token) return
    fetch(`/api/users/${preselectedUserId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.data) openConversation(d.data) })
      .catch(() => {})
  }, [preselectedUserId, loading, openConversation])

  // ── Conversation list ───────────────────────────────────────────────────────
  const listView = (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-extrabold text-gray-900">Messages</h1>
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </div>
        {/* Search bar */}
        <div className="flex items-center gap-2.5 bg-gray-100 rounded-2xl px-4 py-2.5">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-sm text-gray-400">Rechercher une conversation…</span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-24">
        {loading ? (
          <div className="flex flex-col">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-3.5 bg-gray-100 rounded-full w-1/3 mb-2.5" />
                  <div className="h-3 bg-gray-100 rounded-full w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
            <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mb-5">
              <svg className="w-10 h-10 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 3H3a2 2 0 00-2 2v13a2 2 0 002 2h7l3 3 3-3h5a2 2 0 002-2V5a2 2 0 00-2-2z" />
              </svg>
            </div>
            <p className="font-bold text-gray-900 text-lg mb-2">Pas encore de messages</p>
            <p className="text-sm text-gray-400 leading-relaxed">Commence une conversation depuis le profil d'un sportif pour te connecter avec lui.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {conversations.map((conv, idx) => (
              <button
                key={conv.user.id}
                onClick={() => openConversation(conv.user)}
                className={cn(
                  'flex items-center gap-4 px-5 py-3.5 w-full text-left transition-colors active:bg-gray-50',
                  idx < conversations.length - 1 && 'border-b border-gray-50'
                )}
              >
                <div className="relative flex-shrink-0">
                  <Avatar name={conv.user.name} url={conv.user.avatar_url} size={56} />
                  {conv.unread_count > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary-500 rounded-full border-2 border-white" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span className={cn('text-[15px] leading-snug truncate', conv.unread_count > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-800')}>
                      {conv.user.name}
                    </span>
                    <span className={cn('text-xs flex-shrink-0', conv.unread_count > 0 ? 'text-primary-600 font-semibold' : 'text-gray-400')}>
                      {convTimeLabel(conv.last_message.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={cn('text-sm truncate flex-1', conv.unread_count > 0 ? 'text-gray-700 font-medium' : 'text-gray-400')}>
                      {conv.last_message.sender_id === currentUserId && <span className="text-gray-400">Toi · </span>}
                      {conv.last_message.content}
                    </p>
                    {conv.unread_count > 0 && (
                      <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )

  // ── Chat view ───────────────────────────────────────────────────────────────
  if (view !== 'chat' || !activeProfile) return listView

  // Group by day
  const groups: { label: string; msgs: Message[] }[] = []
  for (const msg of messages) {
    const lbl = dateLabel(msg.created_at)
    if (!groups.length || groups[groups.length - 1].label !== lbl) groups.push({ label: lbl, msgs: [] })
    groups[groups.length - 1].msgs.push(msg)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50" style={{ background: '#f8f9fb' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 flex items-center gap-3 flex-shrink-0"
        style={{ paddingTop: 'max(40px, env(safe-area-inset-top))', paddingBottom: 12 }}>
        <button onClick={closeConversation}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 active:bg-gray-200 transition-colors">
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <Avatar name={activeProfile.name} url={activeProfile.avatar_url} size={40} />

        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] text-gray-900 leading-tight truncate">{activeProfile.name}</p>
          <p className="text-xs text-primary-500 font-medium">En ligne</p>
        </div>

        <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-4.5 h-4.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ width: 18, height: 18 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-0.5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 py-16 gap-3">
            <Avatar name={activeProfile.name} url={activeProfile.avatar_url} size={64} />
            <div className="text-center">
              <p className="font-bold text-gray-900">{activeProfile.name}</p>
              <p className="text-sm text-gray-400 mt-1">Envoie un premier message 👋</p>
            </div>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.label}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] text-gray-400 font-medium bg-gray-50 px-2">{group.label}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {group.msgs.map((msg, i) => {
              const isMe = msg.sender_id === currentUserId
              const prevMsg = group.msgs[i - 1]
              const nextMsg = group.msgs[i + 1]
              const sameSenderPrev = prevMsg?.sender_id === msg.sender_id
              const sameSenderNext = nextMsg?.sender_id === msg.sender_id
              const isLast = !sameSenderNext
              const mt = sameSenderPrev ? 'mt-0.5' : 'mt-3'

              return (
                <div key={msg.id} className={cn('flex items-end gap-2', isMe ? 'justify-end' : 'justify-start', mt)}>
                  {/* Avatar (only on last message in a group) */}
                  {!isMe && (
                    <div className="w-7 flex-shrink-0 mb-0.5">
                      {isLast && <Avatar name={activeProfile.name} url={activeProfile.avatar_url} size={28} />}
                    </div>
                  )}

                  <div className={cn('flex flex-col max-w-[72%]', isMe ? 'items-end' : 'items-start')}>
                    <div className={cn(
                      'px-4 py-2.5 text-[15px] leading-relaxed break-words',
                      isMe
                        ? cn('bg-primary-500 text-white shadow-sm',
                            !sameSenderPrev ? 'rounded-t-2xl' : 'rounded-t-lg',
                            !sameSenderNext ? 'rounded-b-2xl rounded-br-sm' : 'rounded-b-lg')
                        : cn('bg-white text-gray-900 shadow-sm border border-gray-100',
                            !sameSenderPrev ? 'rounded-t-2xl' : 'rounded-t-lg',
                            !sameSenderNext ? 'rounded-b-2xl rounded-bl-sm' : 'rounded-b-lg')
                    )}>
                      {msg.content}
                    </div>
                    {isLast && (
                      <span className="text-[10px] text-gray-400 mt-1 mx-1">
                        {timeLabel(msg.created_at)}{isMe && msg.read ? ' · Lu' : ''}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={sendMessage}
        className="bg-white border-t border-gray-100 px-4 py-3 flex items-end gap-2.5"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <div className="flex-1 bg-gray-100 rounded-3xl px-4 py-2.5 flex items-center min-h-[44px]">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message…"
            autoComplete="off"
            className="flex-1 bg-transparent text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
        </div>
        <button type="submit" disabled={!input.trim() || sending}
          className={cn(
            'w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
            input.trim() ? 'bg-primary-500 text-white active:scale-95 shadow-sm' : 'bg-gray-100 text-gray-300'
          )}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ChatPageInner />
    </Suspense>
  )
}
