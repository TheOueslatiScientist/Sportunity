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
function dateLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function ChatPageInner() {
  const searchParams = useSearchParams()
  const preselectedUserId = searchParams.get('user') ?? searchParams.get('userId')

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeProfileRef = useRef<Profile | null>(null)

  useEffect(() => {
    const user = getStoredUser()
    if (user) setCurrentUserId(user.id)
  }, [])

  const loadConversations = useCallback(async () => {
    const token = getAuthToken()
    if (!token) return
    try {
      const res = await fetch('/api/conversations', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setConversations(data.data ?? [])
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await loadConversations()
      setLoading(false)
    }
    init()
  }, [loadConversations])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const loadMessages = useCallback(async (otherUserId: number, silent = false) => {
    const token = getAuthToken()
    if (!token) return
    try {
      const res = await fetch(`/api/messages/${otherUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(data.data ?? [])
        if (!silent) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    } catch { /* ignore */ }
  }, [])

  const openConversation = useCallback(async (profile: Profile) => {
    setActiveProfile(profile)
    activeProfileRef.current = profile
    setMessages([])
    await loadMessages(profile.user_id)

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
    loadConversations()
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault()
    if (!input.trim() || !activeProfile || sending) return

    const token = getAuthToken()
    if (!token) { window.location.href = '/login'; return }

    const text = input.trim()
    setInput('')
    setSending(true)

    const tempMsg: Message = {
      id: Date.now(),
      sender_id: currentUserId!,
      receiver_id: activeProfile.user_id,
      content: text,
      read: false,
      created_at: new Date().toISOString(),
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

  // Open conversation from URL param
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
  if (!activeProfile) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
          <h1 className="text-2xl font-extrabold text-gray-900">Messages</h1>
        </div>

        <div className="flex-1 overflow-y-auto pb-24">
          {loading ? (
            <div className="flex flex-col gap-1 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
                  <div className="w-12 h-12 rounded-2xl bg-gray-200 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">💬</p>
              <p className="font-bold text-gray-900 text-lg">Aucun message</p>
              <p className="text-sm text-gray-500 mt-2">Commence une conversation depuis le profil d&apos;un utilisateur.</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.user.id}
                onClick={() => openConversation(conv.user)}
                className="w-full flex items-center gap-3 p-4 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-100 last:border-0"
              >
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 relative">
                  {conv.user.avatar_url ? (
                    <img src={conv.user.avatar_url} alt={conv.user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 text-lg">
                      {conv.user.name?.[0] ?? '?'}
                    </div>
                  )}
                  {conv.unread_count > 0 && (
                    <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-primary-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('text-sm', conv.unread_count > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-700')}>
                      {conv.user.name}
                    </span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {timeLabel(conv.last_message.created_at)}
                    </span>
                  </div>
                  <p className={cn('text-xs truncate mt-0.5', conv.unread_count > 0 ? 'text-gray-700 font-medium' : 'text-gray-400')}>
                    {conv.last_message.sender_id === currentUserId ? 'Toi : ' : ''}{conv.last_message.content}
                  </p>
                </div>
                {conv.unread_count > 0 && (
                  <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                    {conv.unread_count}
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        <BottomNav />
      </div>
    )
  }

  // ── Active chat ─────────────────────────────────────────────────────────────
  // Group messages by day
  const groups: { label: string; messages: Message[] }[] = []
  for (const msg of messages) {
    const label = dateLabel(msg.created_at)
    if (!groups.length || groups[groups.length - 1].label !== label) {
      groups.push({ label, messages: [] })
    }
    groups[groups.length - 1].messages.push(msg)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-10 pb-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={closeConversation}
          className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
          {activeProfile.avatar_url ? (
            <img src={activeProfile.avatar_url} alt={activeProfile.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 text-lg">
              {activeProfile.name?.[0] ?? '?'}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-900 truncate">{activeProfile.name}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col">
        {messages.length === 0 && (
          <div className="text-center py-16 text-sm text-gray-400">
            Début de la conversation avec {activeProfile.name} 👋
          </div>
        )}
        {groups.map((group) => (
          <div key={group.label}>
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">{group.label}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="flex flex-col gap-1">
              {group.messages.map((msg, i) => {
                const isMe = msg.sender_id === currentUserId
                const prevMsg = group.messages[i - 1]
                const sameSender = prevMsg?.sender_id === msg.sender_id
                return (
                  <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start', sameSender ? 'mt-0.5' : 'mt-3')}>
                    <div className={cn('max-w-[75%] flex flex-col', isMe ? 'items-end' : 'items-start')}>
                      <div className={cn(
                        'px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                        isMe
                          ? 'bg-primary-500 text-white rounded-br-sm'
                          : 'bg-white text-gray-900 shadow-sm border border-gray-100 rounded-bl-sm'
                      )}>
                        {msg.content}
                      </div>
                      {(!sameSender || i === group.messages.length - 1) && (
                        <span className={cn('text-[10px] mt-1 mx-1', isMe ? 'text-gray-400' : 'text-gray-400')}>
                          {timeLabel(msg.created_at)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-2"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écrire un message…"
          autoComplete="off"
          className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="w-10 h-10 bg-primary-500 text-white rounded-2xl flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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
