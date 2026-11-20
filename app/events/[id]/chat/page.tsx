'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getAuthToken, getStoredUser } from '@/lib/client-utils'
import { cn } from '@/lib/utils'

type Message = { id: number; sender_id: number; content: string; created_at: string; sender?: { id: number; name: string; avatar_url?: string } }

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

export default function EventChatPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [denied, setDenied] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const user = getStoredUser()
    if (user) setCurrentUserId(user.id)
  }, [])

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchMessages() {
    const token = getAuthToken()
    if (!token) return
    const res = await fetch(`/api/events/${id}/chat`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.status === 403) { setDenied(true); return }
    if (res.ok) { const d = await res.json(); setMessages(d.data ?? []) }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sending) return
    const token = getAuthToken()
    if (!token) return
    setSending(true)
    const text = input.trim()
    setInput('')
    await fetch(`/api/events/${id}/chat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    })
    await fetchMessages()
    setSending(false)
  }

  if (denied) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-5xl">🔒</span>
      <p className="font-bold text-gray-800 text-lg">Accès réservé</p>
      <p className="text-sm text-gray-500">Tu dois être accepté par le créateur de l'event pour accéder au chat.</p>
      <button onClick={() => router.back()} className="text-primary-600 font-semibold text-sm">← Retour</button>
    </div>
  )

  // Group messages by day
  const groups: { label: string; messages: Message[] }[] = []
  for (const msg of messages) {
    const label = dateLabel(msg.created_at)
    if (!groups.length || groups[groups.length - 1].label !== label) groups.push({ label, messages: [] })
    groups[groups.length - 1].messages.push(msg)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-10 pb-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-10 h-10 rounded-2xl bg-primary-100 flex items-center justify-center text-xl flex-shrink-0">🏅</div>
        <div>
          <p className="font-bold text-sm text-gray-900">Chat de l'événement</p>
          <p className="text-xs text-gray-400">{messages.length > 0 ? `${new Set(messages.map(m => m.sender_id)).size} participant(s)` : 'Aucun message'}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
        {messages.length === 0 && (
          <div className="text-center py-16 text-sm text-gray-400">Sois le premier à écrire un message !</div>
        )}
        {groups.map((group) => (
          <div key={group.label}>
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">{group.label}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            {group.messages.map((msg, i) => {
              const isMe = msg.sender_id === currentUserId
              const prevMsg = group.messages[i - 1]
              const sameSender = prevMsg?.sender_id === msg.sender_id
              return (
                <div key={msg.id} className={cn('flex gap-2 items-end', isMe ? 'justify-end' : 'justify-start', sameSender ? 'mt-0.5' : 'mt-3')}>
                  {!isMe && (
                    <div className={cn('w-7 h-7 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 mb-0.5', sameSender && 'invisible')}>
                      {msg.sender?.avatar_url
                        ? <img src={msg.sender.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">{msg.sender?.name?.[0] ?? '?'}</div>
                      }
                    </div>
                  )}
                  <div className={cn('max-w-[72%]', isMe ? 'items-end' : 'items-start', 'flex flex-col gap-0.5')}>
                    {!isMe && !sameSender && (
                      <span className="text-[10px] font-semibold text-gray-500 ml-1">{msg.sender?.name}</span>
                    )}
                    <div className={cn(
                      'px-3.5 py-2 text-sm leading-relaxed',
                      isMe
                        ? 'bg-primary-500 text-white rounded-2xl rounded-br-sm'
                        : 'bg-white text-gray-900 shadow-sm border border-gray-100 rounded-2xl rounded-bl-sm'
                    )}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-gray-400 mx-1">{timeLabel(msg.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-2" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message…"
          className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary-400"
        />
        <button type="submit" disabled={!input.trim() || sending}
          className="w-10 h-10 bg-primary-500 text-white rounded-2xl flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform flex-shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  )
}
