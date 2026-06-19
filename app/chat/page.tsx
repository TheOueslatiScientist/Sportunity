'use client'
import { useState, useEffect, useRef, FormEvent, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Conversation, Message, Profile } from '@/types'
import BottomNav from '@/components/BottomNav'
import { cn } from '@/lib/utils'
import { getStoredUser, getAuthToken } from '@/lib/client-utils'

function ChatPageInner() {
  const searchParams = useSearchParams()
  const preselectedUserId = searchParams.get('userId')

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const user = getStoredUser()
    if (user) setCurrentUserId(user.id)
  }, [])

  // Load conversations from API + seed with mock fallback
  useEffect(() => {
    loadConversations()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Stop polling when leaving a conversation
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  async function loadConversations() {
    setLoading(true)
    try {
      const token = getAuthToken()
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch('/api/conversations', { headers })
      if (res.ok) {
        const data = await res.json()
        setConversations(data.data ?? [])
      } else {
        // Fallback to mock
        const { CONVERSATIONS } = await import('@/lib/mock-data')
        setConversations(CONVERSATIONS)
      }
    } catch {
      const { CONVERSATIONS } = await import('@/lib/mock-data')
      setConversations(CONVERSATIONS)
    } finally {
      setLoading(false)
    }
  }

  async function openConversation(profile: Profile) {
    setActiveProfile(profile)
    await loadMessages(profile.user_id)

    // Poll for new messages every 3s
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => {
      loadMessages(profile.user_id, true)
    }, 3000)
  }

  async function loadMessages(otherUserId: number, silent = false) {
    const token = getAuthToken()
    if (!token) return
    if (!silent) setMessages([])
    try {
      const res = await fetch(`/api/messages/${otherUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(data.data ?? [])
      }
    } catch {
      // silently fail on poll
    }
  }

  function closeConversation() {
    if (pollRef.current) clearInterval(pollRef.current)
    setActiveProfile(null)
    setMessages([])
    loadConversations()
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault()
    if (!input.trim() || !activeProfile) return

    const token = getAuthToken()
    if (!token) { window.location.href = '/login'; return }

    const text = input.trim()
    setInput('')
    setSending(true)

    // Optimistic update
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
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiver_id: activeProfile.user_id, content: text }),
      })
      if (res.ok) {
        // Replace temp message with real one
        await loadMessages(activeProfile.user_id, true)
      }
    } finally {
      setSending(false)
    }
  }

  // Pre-select user from URL param
  useEffect(() => {
    if (!preselectedUserId || loading) return
    import('@/lib/mock-data').then(({ PROFILES }) => {
      const profile = PROFILES.find((p) => p.user_id === parseInt(preselectedUserId))
      if (profile) openConversation(profile)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedUserId, loading])

  // ── Conversation list view ──────────────────────────────────────────────────
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
                className="w-full flex items-center gap-3 p-4 bg-white hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
              >
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 relative">
                  {conv.user.avatar_url ? (
                    <img src={conv.user.avatar_url} alt={conv.user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">
                      {conv.user.name[0]}
                    </div>
                  )}
                  {conv.unread_count > 0 && (
                    <div className="absolute top-0 right-0 w-3 h-3 bg-primary-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className={cn('text-sm', conv.unread_count > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-700')}>
                      {conv.user.name}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(conv.last_message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className={cn('text-xs truncate mt-0.5', conv.unread_count > 0 ? 'text-gray-700 font-medium' : 'text-gray-400')}>
                    {conv.last_message.content}
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

  // ── Active chat view ────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Chat header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex items-center gap-3 flex-shrink-0">
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
            <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">
              {activeProfile.name[0]}
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm text-gray-900">{activeProfile.name}</p>
          <p className="text-xs text-green-500 font-medium">En ligne</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {messages.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">
            Début de la conversation avec {activeProfile.name}
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId
          return (
            <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[75%] px-4 py-2.5 rounded-2xl text-sm',
                  isMe
                    ? 'bg-primary-500 text-white rounded-br-sm'
                    : 'bg-white text-gray-900 shadow-card rounded-bl-sm'
                )}
              >
                <p>{msg.content}</p>
                <p className={cn('text-[10px] mt-1', isMe ? 'text-white/60' : 'text-gray-400')}>
                  {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-2 pb-safe"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écrire un message…"
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
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ChatPageInner />
    </Suspense>
  )
}
