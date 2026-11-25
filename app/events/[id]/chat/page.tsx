'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { getAuthToken, getStoredUser } from '@/lib/client-utils'
import { cn } from '@/lib/utils'

type ChatMessage = {
  id: number
  sender_id: number
  content: string
  created_at: string
  sender: { id: number; name: string; avatar_url?: string } | null
}

function timeLabel(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function Avatar({ name, url, size = 7 }: { name?: string; url?: string; size?: number }) {
  const initials = (name ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return url ? (
    <img src={url} alt={name} className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`} />
  ) : (
    <div className={`w-${size} h-${size} rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary-700`}>
      {initials}
    </div>
  )
}

export default function EventChatPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = parseInt(params.id as string)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [eventTitle, setEventTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const currentUser = getStoredUser()

  const fetchMessages = useCallback(async () => {
    const token = getAuthToken()
    if (!token) { router.push('/login'); return }
    const res = await fetch(`/api/events/${eventId}/chat`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 403) { setError("Tu dois être accepté dans cet événement pour accéder au chat."); setLoading(false); return }
    if (!res.ok) { setError("Impossible de charger le chat."); setLoading(false); return }
    const json = await res.json()
    setMessages(json.data ?? [])
    setEventTitle(json.event?.title ?? '')
    setLoading(false)
  }, [eventId, router])

  useEffect(() => {
    fetchMessages()

    let channel: RealtimeChannel | null = null
    import('@/lib/supabase').then(({ createBrowserClient }) => {
      const supabase = createBrowserClient()
      channel = supabase
        .channel(`event_chat_${eventId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_messages', filter: `eventId=eq.${eventId}` },
          () => { void fetchMessages() })
        .subscribe()
    })

    return () => { channel?.unsubscribe() }
  }, [eventId, fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!text.trim() || sending) return
    const token = getAuthToken()
    if (!token) return
    setSending(true)
    const res = await fetch(`/api/events/${eventId}/chat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text.trim() }),
    })
    if (res.ok) {
      setText('')
      void fetchMessages()
    }
    setSending(false)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors -ml-1">
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 font-medium">Chat de l'événement</p>
          <p className="font-bold text-gray-900 text-sm truncate">{eventTitle || '…'}</p>
        </div>
        <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center text-lg">👥</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <span className="text-5xl">🔒</span>
            <p className="font-bold text-gray-700">{error}</p>
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <span className="text-5xl">💬</span>
            <p className="font-bold text-gray-700">Aucun message</p>
            <p className="text-sm text-gray-400">Soyez le premier à écrire dans ce groupe !</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUser?.id
          return (
            <div key={msg.id} className={cn('flex items-end gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>
              {!isMe && <Avatar name={msg.sender?.name} url={msg.sender?.avatar_url} size={7} />}
              <div className={cn('max-w-[72%] flex flex-col gap-0.5', isMe ? 'items-end' : 'items-start')}>
                {!isMe && (
                  <p className="text-[10px] font-semibold text-gray-500 px-1">{msg.sender?.name ?? '?'}</p>
                )}
                <div className={cn(
                  'px-3.5 py-2 rounded-2xl text-sm leading-relaxed',
                  isMe
                    ? 'bg-primary-500 text-white rounded-br-sm'
                    : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm shadow-sm'
                )}>
                  {msg.content}
                </div>
                <p className="text-[10px] text-gray-400 px-1">{timeLabel(msg.created_at)}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!error && (
        <div className="bg-white border-t border-gray-100 px-4 py-3 pb-safe flex items-end gap-2" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px` }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() } }}
            placeholder="Message…"
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 overflow-hidden"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            onClick={() => void handleSend()}
            disabled={!text.trim() || sending}
            className="w-11 h-11 flex-shrink-0 rounded-2xl bg-primary-500 flex items-center justify-center disabled:opacity-40 transition-all active:scale-95"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
