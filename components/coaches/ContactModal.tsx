'use client'
import { useState, FormEvent } from 'react'
import { Coach } from '@/types'
import Button from '@/components/ui/Button'
import { getAuthToken } from '@/lib/client-utils'

interface ContactModalProps {
  coach: Coach
  onClose: () => void
  onSent?: () => void
}

export default function ContactModal({ coach, onClose, onSent }: ContactModalProps) {
  const [message, setMessage] = useState(
    `Bonjour ${coach.profile?.name?.split(' ')[0] ?? 'coach'} ! Je suis intéressé(e) par tes séances de ${coach.sport?.name ?? 'coaching'}. Peux-tu me donner plus d'informations sur ta méthode et tes disponibilités ?`
  )
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    const token = getAuthToken()
    if (!token) { window.location.href = '/login'; return }
    setSending(true)
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiver_id: coach.user_id, content: message.trim() }),
      })
      setSent(true)
      setTimeout(() => { onSent?.(); onClose() }, 1800)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" style={{ zIndex: 1100 }} onClick={onClose} />

      {/* Modal */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slide-up p-5" style={{ zIndex: 1200 }}>
        {/* Handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {sent ? (
          <div className="text-center py-8 animate-fade-in">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-1">Message envoyé !</h3>
            <p className="text-sm text-gray-400">{coach.profile?.name} te répondra rapidement.</p>
          </div>
        ) : (
          <form onSubmit={handleSend}>
            {/* Coach info */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                {coach.profile?.avatar_url ? (
                  <img src={coach.profile.avatar_url} alt={coach.profile.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">{coach.sport?.icon}</div>
                )}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{coach.profile?.name}</p>
                <p className="text-xs text-gray-400">Coach {coach.sport?.name}</p>
              </div>
            </div>

            <label className="text-sm font-semibold text-gray-700 mb-2 block">Ton message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none mb-4"
            />

            <div className="flex gap-3">
              <Button type="button" variant="secondary" fullWidth onClick={onClose}>Annuler</Button>
              <Button type="submit" fullWidth loading={sending} disabled={!message.trim()}>
                Envoyer
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}
