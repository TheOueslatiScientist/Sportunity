'use client'
import { useState, useEffect, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sport, Infrastructure } from '@/types'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getAuthToken } from '@/lib/client-utils'

const LEVELS = [
  { value: 'all', label: 'Tous niveaux' },
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
]

function NewEventPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sports, setSports] = useState<Sport[]>([])
  const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([])
  const [title, setTitle] = useState('')
  const [sportId, setSportId] = useState<number | ''>('')
  const [infraId, setInfraId] = useState<number | ''>(
    searchParams.get('infrastructure') ? parseInt(searchParams.get('infrastructure')!) : ''
  )
  const [date, setDate] = useState('')
  const [maxParticipants, setMaxParticipants] = useState(10)
  const [description, setDescription] = useState('')
  const [level, setLevel] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/sports').then((r) => r.json()),
      fetch('/api/infrastructures').then((r) => r.json()),
    ]).then(([sRes, iRes]) => {
      setSports(sRes.data ?? [])
      setInfrastructures(iRes.data ?? [])
    })

    // Default date = tomorrow 18h
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(18, 0, 0, 0)
    setDate(d.toISOString().slice(0, 16))
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!sportId) { setError('Sélectionne un sport.'); return }
    const token = getAuthToken()
    if (!token) { router.push('/login'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          sport_id: sportId,
          infrastructure_id: infraId || undefined,
          date: new Date(date).toISOString(),
          max_participants: maxParticipants,
          description,
          level,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push('/events')
    } catch {
      setError('Erreur réseau, réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-extrabold text-gray-900">Créer un événement</h1>
      </div>

      <div className="px-4 py-6 pb-24 max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Titre de l'événement"
            placeholder="Match foot 5v5 ce soir"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          {/* Sport */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Sport *</label>
            <div className="grid grid-cols-4 gap-2">
              {sports.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSportId(s.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all duration-200',
                    sportId === s.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  )}
                >
                  <span className="text-2xl">{s.icon}</span>
                  <span className="text-[10px] font-medium text-gray-600 truncate w-full text-center">{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Infrastructure */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Lieu (optionnel)</label>
            <select
              value={infraId}
              onChange={(e) => setInfraId(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            >
              <option value="">Choisir un terrain</option>
              {infrastructures.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <Input
            label="Date et heure"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          {/* Max participants */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Participants max : <span className="text-primary-500 font-bold">{maxParticipants}</span>
            </label>
            <input
              type="range"
              min={2}
              max={30}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
              className="w-full accent-primary-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>2</span>
              <span>30</span>
            </div>
          </div>

          {/* Level */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Niveau</label>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLevel(l.value)}
                  className={cn(
                    'px-4 py-2 rounded-2xl text-xs font-semibold transition-all duration-200',
                    level === l.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décris l'événement, le niveau requis, ce qu'il faut apporter…"
              rows={3}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Spacer so sticky bar doesn't overlap */}
          <div className="h-4" />
        </form>
      </div>

      {/* Sticky submit bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4" style={{ zIndex: 900 }}>
        <Button
          type="button"
          fullWidth
          size="lg"
          loading={loading}
          onClick={() => {
            const form = document.querySelector('form') as HTMLFormElement
            form?.requestSubmit()
          }}
        >
          🚀 Publier l&apos;événement
        </Button>
      </div>
    </div>
  )
}

export default function NewEventPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <NewEventPageInner />
    </Suspense>
  )
}
