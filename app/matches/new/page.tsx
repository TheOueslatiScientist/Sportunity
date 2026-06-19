'use client'
import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Sport } from '@/types'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getAuthToken } from '@/lib/client-utils'

type CreationType = 'match' | 'tournament' | 'competition'
type CompetitionType = 'race' | 'tournament' | 'championship' | 'other'

const LEVEL_OPTIONS = [
  { value: 'all', label: '🏅 Tous niveaux' },
  { value: 'beginner', label: '🟢 Débutant' },
  { value: 'intermediate', label: '🟡 Intermédiaire' },
  { value: 'advanced', label: '🔴 Avancé' },
]

const COMP_TYPE_OPTIONS: { value: CompetitionType; label: string }[] = [
  { value: 'race', label: '🏁 Course' },
  { value: 'tournament', label: '🏆 Tournoi' },
  { value: 'championship', label: '🥇 Championnat' },
  { value: 'other', label: '🎯 Autre' },
]

export default function NewMatchPage() {
  const router = useRouter()
  const [creationType, setCreationType] = useState<CreationType>('match')
  const [sports, setSports] = useState<Sport[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [locating, setLocating] = useState(false)

  // Common fields
  const [title, setTitle] = useState('')
  const [sportId, setSportId] = useState<number | ''>('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [city, setCity] = useState('')
  const [description, setDescription] = useState('')

  // Match-specific
  const [maxPlayers, setMaxPlayers] = useState('')
  const [level, setLevel] = useState('all')
  const [hasTeams, setHasTeams] = useState(false)
  const [teamAName, setTeamAName] = useState('Équipe A')
  const [teamBName, setTeamBName] = useState('Équipe B')

  // Tournament-specific
  const [maxTeams, setMaxTeams] = useState('')
  const [endDate, setEndDate] = useState('')
  const [prize, setPrize] = useState('')

  // Competition-specific
  const [maxParticipants, setMaxParticipants] = useState('')
  const [compType, setCompType] = useState<CompetitionType>('race')
  const [distanceKm, setDistanceKm] = useState('')
  const [priceEntry, setPriceEntry] = useState('')

  useEffect(() => {
    fetch('/api/sports').then((r) => r.json()).then((d) => setSports(d.data ?? []))
  }, [])

  function geolocate() {
    setLocating(true)
    navigator.geolocation?.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setLocating(false) },
      () => setLocating(false)
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!title || !sportId || !date || !time || !location || !city) {
      setError('Veuillez remplir tous les champs obligatoires.')
      return
    }

    const token = getAuthToken()
    if (!token) { router.push('/login'); return }

    setLoading(true)
    const dateTime = `${date}T${time}:00`

    try {
      let endpoint = '/api/matches'
      let body: Record<string, unknown> = { title, sport_id: sportId, date: dateTime, location, city, lat, lng, description }

      if (creationType === 'match') {
        if (!maxPlayers) { setError('Nombre de joueurs requis.'); setLoading(false); return }
        endpoint = '/api/matches'
        body = { ...body, max_players: maxPlayers, level, has_teams: hasTeams, team_a_name: teamAName, team_b_name: teamBName }
      } else if (creationType === 'tournament') {
        if (!maxTeams) { setError('Nombre d\'équipes requis.'); setLoading(false); return }
        endpoint = '/api/tournaments'
        body = { ...body, start_date: dateTime, end_date: endDate ? `${endDate}T${time}:00` : undefined, max_teams: maxTeams, prize }
      } else {
        if (!maxParticipants) { setError('Nombre de participants requis.'); setLoading(false); return }
        endpoint = '/api/competitions'
        body = { ...body, max_participants: maxParticipants, type: compType, distance_km: distanceKm, price_entry: priceEntry }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }

      if (creationType === 'match') router.push(`/matches/${data.data.id}`)
      else router.push('/matches')
    } catch {
      setError('Erreur réseau, réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Créer un événement</h1>
            <p className="text-xs text-gray-400">MEL — Métropole Européenne de Lille</p>
          </div>
        </div>

        {/* Type selector */}
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
          {([
            { key: 'match', icon: '⚽', label: 'Match' },
            { key: 'tournament', icon: '🏆', label: 'Tournoi' },
            { key: 'competition', icon: '🏁', label: 'Compétition' },
          ] as { key: CreationType; icon: string; label: string }[]).map((t) => (
            <button key={t.key} onClick={() => setCreationType(t.key)}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-bold transition-all',
                creationType === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
              )}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="px-4 py-6 max-w-lg mx-auto pb-32 flex flex-col gap-5">

          {/* Sport selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Sport *</label>
            <div className="grid grid-cols-5 gap-2">
              {sports.map((s) => (
                <button key={s.id} type="button" onClick={() => setSportId(s.id)}
                  className={cn('flex flex-col items-center gap-1 p-2.5 rounded-2xl border-2 transition-all',
                    sportId === s.id ? 'border-primary-500 bg-primary-50' : 'border-gray-100 bg-white hover:border-gray-200')}>
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-[9px] font-medium text-gray-600 truncate w-full text-center leading-tight">{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          <Input label="Titre *" placeholder={
            creationType === 'match' ? 'ex : Match foot 5v5 — Citadelle' :
            creationType === 'tournament' ? 'ex : Tournoi Basketball Open MEL' :
            'ex : Lille City Run 10km'
          } value={title} onChange={(e) => setTitle(e.target.value)} />

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Heure *</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
            </div>
          </div>

          {/* Lieu */}
          <Input label="Lieu / Terrain *" placeholder="ex : Stade de la Citadelle" value={location} onChange={(e) => setLocation(e.target.value)} />

          {/* Ville + géoloc */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Ville *</label>
            <div className="flex gap-2">
              <input type="text" placeholder="ex : Lille" value={city} onChange={(e) => setCity(e.target.value)}
                className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
              <button type="button" onClick={geolocate}
                className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0 hover:bg-blue-100 transition-colors">
                {locating
                  ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  : <svg className={cn('w-5 h-5', lat ? 'text-blue-500' : 'text-gray-400')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                }
              </button>
            </div>
            {lat && <p className="text-[11px] text-blue-500 mt-1 font-medium">✓ Position GPS enregistrée ({lat.toFixed(4)}, {lng?.toFixed(4)})</p>}
          </div>

          {/* Match-specific fields */}
          {creationType === 'match' && (
            <>
              <Input label="Nombre de joueurs max *" type="number" min="2" max="50"
                placeholder="ex : 10" value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} />

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Niveau</label>
                <div className="flex gap-2 flex-wrap">
                  {LEVEL_OPTIONS.map((l) => (
                    <button key={l.value} type="button" onClick={() => setLevel(l.value)}
                      className={cn('px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all',
                        level === l.value ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Répartir en équipes</p>
                  <p className="text-xs text-gray-400">Attribuer les joueurs à des équipes</p>
                </div>
                <button type="button" onClick={() => setHasTeams((v) => !v)}
                  className={cn('w-12 h-6 rounded-full transition-all relative', hasTeams ? 'bg-primary-500' : 'bg-gray-200')}>
                  <div className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all', hasTeams ? 'left-6.5' : 'left-0.5')}
                    style={{ left: hasTeams ? '26px' : '2px' }} />
                </button>
              </div>

              {hasTeams && (
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Nom équipe A" placeholder="Équipe Rouge" value={teamAName} onChange={(e) => setTeamAName(e.target.value)} />
                  <Input label="Nom équipe B" placeholder="Équipe Bleue" value={teamBName} onChange={(e) => setTeamBName(e.target.value)} />
                </div>
              )}
            </>
          )}

          {/* Tournament-specific */}
          {creationType === 'tournament' && (
            <>
              <Input label="Nombre d'équipes max *" type="number" min="2" max="64"
                placeholder="ex : 8" value={maxTeams} onChange={(e) => setMaxTeams(e.target.value)} />
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Date de fin (optionnel)</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={date || new Date().toISOString().split('T')[0]}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
              </div>
              <Input label="Prix / Récompense" placeholder="ex : Trophée + médailles top 3" value={prize} onChange={(e) => setPrize(e.target.value)} />
            </>
          )}

          {/* Competition-specific */}
          {creationType === 'competition' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Type de compétition *</label>
                <div className="flex gap-2 flex-wrap">
                  {COMP_TYPE_OPTIONS.map((t) => (
                    <button key={t.value} type="button" onClick={() => setCompType(t.value)}
                      className={cn('px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all',
                        compType === t.value ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <Input label="Nombre de participants max *" type="number" min="2"
                placeholder="ex : 200" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Distance (km)" type="number" min="0" step="0.1"
                  placeholder="ex : 10" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} />
                <Input label="Frais d'inscription (€)" type="number" min="0"
                  placeholder="ex : 15" value={priceEntry} onChange={(e) => setPriceEntry(e.target.value)} />
              </div>
            </>
          )}

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              placeholder="Informations supplémentaires, règles, équipement requis…"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3">{error}</div>
          )}
        </div>

        {/* Sticky CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
          <Button type="submit" fullWidth size="lg" loading={loading}>
            {creationType === 'match' ? '⚽ Créer le match' :
             creationType === 'tournament' ? '🏆 Créer le tournoi' : '🏁 Créer la compétition'}
          </Button>
        </div>
      </form>
    </div>
  )
}
