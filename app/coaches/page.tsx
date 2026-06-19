'use client'
import { useState, useEffect } from 'react'
import { Coach } from '@/types'
import CoachCard from '@/components/cards/CoachCard'
import BottomNav from '@/components/BottomNav'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const SPORT_FILTERS = [
  { value: 'all',        label: '🏅 Tous' },
  { value: 'Football',   label: '⚽ Foot' },
  { value: 'Basketball', label: '🏀 Basket' },
  { value: 'Tennis',     label: '🎾 Tennis' },
  { value: 'Running',    label: '🏃 Running' },
  { value: 'Natation',   label: '🏊 Natation' },
  { value: 'Gym/Fitness',label: '💪 Gym' },
  { value: 'Padel',      label: '🏓 Padel' },
]

const MAX_PRICE_OPTIONS = [
  { value: '', label: 'Tous prix' },
  { value: '40',  label: '≤ 40€' },
  { value: '60',  label: '≤ 60€' },
  { value: '80',  label: '≤ 80€' },
  { value: '100', label: '≤ 100€' },
]

export default function CoachesPage() {
  const [coaches, setCoaches]           = useState<Coach[]>([])
  const [loading, setLoading]           = useState(true)
  const [sport, setSport]               = useState('all')
  const [maxPrice, setMaxPrice]         = useState('')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [onlyCertified, setOnlyCertified] = useState(false)
  const [showFilters, setShowFilters]   = useState(false)
  const [userLat, setUserLat]           = useState<number | null>(null)
  const [userLng, setUserLng]           = useState<number | null>(null)

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude) },
      () => {}
    )
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (sport !== 'all')    params.set('sport', sport)
    if (maxPrice)           params.set('maxPrice', maxPrice)
    if (onlyAvailable)      params.set('available', 'true')
    if (onlyCertified)      params.set('certified', 'true')
    if (userLat)            params.set('lat', String(userLat))
    if (userLng)            params.set('lng', String(userLng))
    fetch(`/api/coaches?${params}`)
      .then((r) => r.json())
      .then((d) => { setCoaches(d.data ?? []); setLoading(false) })
  }, [sport, maxPrice, onlyAvailable, onlyCertified, userLat, userLng])

  const activeFiltersCount = [
    sport !== 'all',
    maxPrice !== '',
    onlyAvailable,
    onlyCertified,
  ].filter(Boolean).length

  function resetFilters() {
    setSport('all')
    setMaxPrice('')
    setOnlyAvailable(false)
    setOnlyCertified(false)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Coachs</h1>
            <p className="text-xs text-gray-400">Trouve le coach qui te correspond</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold transition-all',
                showFilters || activeFiltersCount > 0
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0014 13.828V20a1 1 0 01-1.447.894l-4-2A1 1 0 018 18v-4.172a1 1 0 00-.293-.707L1.293 6.707A1 1 0 011 6V4z" />
              </svg>
              Filtres
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Sport pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {SPORT_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setSport(f.value)}
              className={cn('px-3 py-1.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all',
                sport === f.value ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Advanced filters panel */}
        {showFilters && (
          <div className="mt-3 bg-gray-50 rounded-2xl p-3 flex flex-col gap-3 animate-fade-in">
            {/* Price */}
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Prix max</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-none">
                {MAX_PRICE_OPTIONS.map((p) => (
                  <button key={p.value} onClick={() => setMaxPrice(p.value)}
                    className={cn('px-3 py-1.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all',
                      maxPrice === p.value ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 border border-gray-200')}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex gap-3">
              <button onClick={() => setOnlyAvailable((v) => !v)}
                className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-2xl text-xs font-semibold border-2 transition-all',
                  onlyAvailable ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-500')}>
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Disponible maintenant
              </button>
              <button onClick={() => setOnlyCertified((v) => !v)}
                className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-2xl text-xs font-semibold border-2 transition-all',
                  onlyCertified ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500')}>
                ✅ Certifié
              </button>
            </div>

            {activeFiltersCount > 0 && (
              <button onClick={resetFilters} className="text-xs text-red-500 font-semibold text-center py-1">
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4">
        {/* Become coach CTA */}
        <Link href="/coaches/become"
          className="block mb-4 bg-gradient-to-r from-primary-500 to-emerald-500 rounded-3xl p-4 text-white shadow-lg shadow-primary-500/25 active:scale-[0.98] transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-extrabold text-base">Tu es coach sportif ?</p>
              <p className="text-xs text-white/80 mt-0.5">Rejoins la marketplace et trouve des élèves</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">🏅</div>
          </div>
          <div className="mt-3 bg-white/20 rounded-2xl py-2 text-center text-xs font-bold">
            Créer mon profil coach →
          </div>
        </Link>

        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-3xl h-52 animate-pulse" />)}
          </div>
        ) : coaches.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🔍</p>
            <p className="font-bold text-gray-900 text-lg mb-2">Aucun coach trouvé</p>
            <p className="text-sm text-gray-500 mb-4">Essaie un autre sport ou modifie les filtres.</p>
            <button onClick={resetFilters} className="text-primary-600 font-semibold text-sm">
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-gray-400 font-medium">{coaches.length} coach{coaches.length > 1 ? 's' : ''} trouvé{coaches.length > 1 ? 's' : ''}</p>
            {coaches.map((coach) => <CoachCard key={coach.id} coach={coach} />)}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
