'use client'
import { useState, useEffect, useRef, FormEvent } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getStoredUser, getAuthToken } from '@/lib/client-utils'
import { cn } from '@/lib/utils'

type Message = { id: number; sender_id: number; sender: { id: number; name: string; avatar_url?: string } | null; content: string; created_at: string }

function timeLabel(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

export default function MatchChatPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const matchId = id

  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [matchTitle, setMatchTitle] = useState('')
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const u = getStoredUser()
    if (!u) { router.push('/login'); return }
    setCurrentUserId(u.id)
    loadMessages()
    loadMatch()
    // Poll every 5s
    const interval = setInterval(loadMessages, 5000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId])

  async function loadMatch() {
    const token = getAuthToken()
    const res = await fetch(`/api/matches/${matchId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (res.ok) { const d = await res.json(); setMatchTitle(d.data?.title ?? 'Chat du match') }
  }

  async function loadMessages() {
    const token = getAuthToken()
    if (!token) return
    const res = await fetch(`/api/matches/${matchId}/chat`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) {
      const d = await res.json()
      setMessages(d.data ?? [])
      setLoading(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } else {
      setLoading(false)
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!text.trim() || sending) return
    const token = getAuthToken()
    if (!token) { router.push('/login'); return }
    setSending(true)
    const content = text.trim()
    setText('')
    const res = await fetch(`/api/matches/${matchId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content }),
    })
    if (res.ok) {
      const d = await res.json()
      setMessages((prev) => [...prev, d.data])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
    setSending(false)
    inputRef.current?.focus()
  }

  // Group messages by day
  const grouped: { day: string; msgs: Message[] }[] = []
  for (const msg of messages) {
    const day = dayLabel(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last && last.day === day) last.msgs.push(msg)
    else grouped.push({ day, msgs: [msg] })
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm">👥</span>
              </div>
              <p className="font-extrabold text-gray-900 text-base truncate">{matchTitle || 'Chat du match'}</p>
            </div>
            <p className="text-xs text-gray-400 ml-9">Groupe — participants uniquement</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
            <span className="text-5xl">💬</span>
            <p className="font-bold text-gray-700">Aucun message pour l&apos;instant</p>
            <p className="text-sm text-gray-400 text-center">Soyez le premier à écrire dans le groupe !</p>
          </div>
        )}

        {grouped.map(({ day, msgs }) => (
          <div key={day}>
            {/* Day separator */}
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] font-semibold text-gray-400 px-2">{day}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {msgs.map((msg, i) => {
              const isMe = msg.sender_id === currentUserId
              const prevMsg = i > 0 ? msgs[i - 1] : null
              const sameSender = prevMsg?.sender_id === msg.sender_id
              return (
                <div key={msg.id} className={cn('flex gap-2 mb-1', isMe ? 'flex-row-reverse' : 'flex-row', sameSender ? 'mt-0.5' : 'mt-3')}>
                  {/* Avatar */}
                  {!isMe && !sameSender ? (
                    <div className="w-8 h-8 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 self-end">
                      <img src={msg.sender?.avatar_url ?? `https://api.dicebear.com/8.x/avataaars/svg?seed=${msg.sender?.name}`}
                        alt={msg.sender?.name ?? ''} className="w-full h-full object-cover" />
                    </div>
                  ) : !isMe ? (
                    <div className="w-8 flex-shrink-0" />
                  ) : null}

                  <div className={cn('flex flex-col max-w-[72%]', isMe ? 'items-end' : 'items-start')}>
                    {!isMe && !sameSender && (
                      <span className="text-[11px] font-semibold text-gray-500 ml-1 mb-0.5">{msg.sender?.name ?? 'Utilisateur'}</span>
                    )}
                    <div className={cn(
                      'px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                      isMe
                        ? 'bg-primary-500 text-white rounded-br-md'
                        : 'bg-white text-gray-900 shadow-sm border border-gray-100 rounded-bl-md'
                    )}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-0.5 mx-1">{timeLabel(msg.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex-shrink-0 pb-safe">
        <form onSubmit={handleSend} className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message au groupe…"
            className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
          />
          <button type="submit" disabled={!text.trim() || sending}
            className={cn(
              'w-10 h-10 rounded-2xl flex items-center justify-center transition-all flex-shrink-0',
              text.trim() ? 'bg-primary-500 text-white active:scale-95' : 'bg-gray-100 text-gray-300'
            )}>
            {sending ? (
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
  )
}
