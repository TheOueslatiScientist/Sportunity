'use client'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

type Message = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'Terrains de foot à Lille ?',
  'Matchs ouverts ce weekend',
  'Trouver un coach de tennis',
  'Tournois de basket',
]

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [open, messages])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json() as { reply?: string; error?: string }
      setMessages([...next, { role: 'assistant', content: data.reply ?? 'Désolé, une erreur est survenue.' }])
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Problème réseau, réessaie.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-24 right-4 z-[1100] w-14 h-14 rounded-full bg-primary-700 shadow-xl flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Ouvrir le chatbot"
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6a2 2 0 012-2h14a2 2 0 012 2v10z" />
          </svg>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-40 right-4 z-[1090] w-[min(360px,calc(100vw-2rem))] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          style={{ maxHeight: 'min(500px, calc(100dvh - 180px))' }}>

          {/* Header */}
          <div className="bg-primary-800 px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-sm">Assistant Sportunity</p>
              <p className="text-white/60 text-xs">MEL · Toujours là pour t&apos;aider</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2 min-h-0">
            {messages.length === 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-gray-500 text-center pt-1">Bonjour ! Que cherches-tu ?</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => sendMessage(s)}
                      className="text-xs px-3 py-1.5 rounded-full border border-primary-200 text-primary-700 hover:bg-primary-50 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                  m.role === 'user'
                    ? 'bg-primary-700 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                )}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2 border-t border-gray-100 flex gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              placeholder="Pose ta question..."
              className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700 transition-colors"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-primary-700 flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all flex-shrink-0"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
