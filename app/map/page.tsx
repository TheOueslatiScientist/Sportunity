'use client'
import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Infrastructure, SportEvent, Coach } from '@/types'
import InfrastructureSheet from '@/components/cards/InfrastructureSheet'
import BottomNav from '@/components/BottomNav'
import { cn, haversineDistance } from '@/lib/utils'
import { getAuthToken } from '@/lib/client-utils'
import Link from 'next/link'

const MapComponent = dynamic(() => import('@/components/Map/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-gray-500 font-medium">Chargement de la carte…</p>
      </div>
    </div>
  ),
})

// ─── Coach mini-fiche (popup quand on clique sur un coach sur la carte) ───────
function CoachSheet({ coach, onClose }: { coach: Coach; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/20" style={{ zIndex: 800 }} onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-5" style={{ zIndex: 900 }}>
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 border-2 border-white shadow-card"
            style={{ borderColor: coach.sport?.color ?? '#8b5cf6' }}>
            {coach.profile?.avatar_url ? (
              <img src={coach.profile.avatar_url} alt={coach.profile.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary-50 text-primary-700 font-bold text-sm">{coach.profile?.name?.[0] ?? 'C'}</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-gray-900">{coach.profile?.name}</p>
            <p className="text-xs text-gray-400">Coach {coach.sport?.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-bold text-primary-600">{coach.hourly_rate}€/h</span>
              <span className="text-yellow-500 text-xs">★ {coach.rating.toFixed(1)}</span>
              {coach.is_available_now && (
                <span className="text-[10px] font-semibold bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Dispo</span>
              )}
              {coach.distance != null && (
                <span className="text-[10px] font-medium text-gray-400">{coach.distance < 1 ? `${Math.round(coach.distance * 1000)}m` : `${coach.distance.toFixed(1)}km`}</span>
              )}
            </div>
          </div>
        </div>
        {coach.specialties && coach.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {coach.specialties.slice(0, 4).map((s) => (
              <span key={s} className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{s}</span>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <Link href={`/coaches/${coach.id}`} className="flex-1 py-3 rounded-2xl bg-primary-500 text-white text-sm font-bold text-center">
            Voir le profil
          </Link>
          <Link href={`/chat?userId=${coach.user_id}`} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 text-sm font-bold text-center">
            Contacter
          </Link>
        </div>
      </div>
    </>
  )
}

// ─── Filter chip ─────────────────────────────────────────────────────────────
function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-200 shadow-sm flex-shrink-0',
        active ? 'bg-primary-500 text-white shadow-primary-500/30' : 'bg-white/95 text-gray-700 backdrop-blur-sm hover:bg-gray-50'
      )}
    >
      {label}
    </button>
  )
}

const SPORT_FILTERS = [
  { value: 'all',        label: 'Tous' },
  { value: 'football',   label: 'Foot' },
  { value: 'basketball', label: 'Basket' },
  { value: 'tennis',     label: 'Tennis' },
  { value: 'running',    label: 'Running' },
  { value: 'swimming',   label: 'Natation' },
  { value: 'gym',        label: 'Gym' },
  { value: 'padel',      label: 'Padel' },
  { value: 'volleyball', label: 'Volley' },
]

const STATUS_FILTERS = [
  { value: 'all',       label: 'Tous' },
  { value: 'available', label: 'Disponible' },
  { value: 'occupied',  label: 'Occupé' },
]

const ACCESS_FILTERS = [
  { value: 'all',     label: 'Tous' },
  { value: 'public',  label: 'Public' },
  { value: 'private', label: 'Privé' },
]

const DISTANCE_FILTERS = [
  { value: 0,    label: 'Tous' },
  { value: 1,    label: '< 1 km' },
  { value: 3,    label: '< 3 km' },
  { value: 5,    label: '< 5 km' },
  { value: 10,   label: '< 10 km' },
]

const LAYER_FILTERS = [
  { value: 'infra',   label: 'Terrains' },
  { value: 'coaches', label: 'Coachs' },
  { value: 'events',  label: 'Événements' },
]

export default function MapPage() {
  const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [filteredInfras, setFilteredInfras]   = useState<Infrastructure[]>([])
  const [filteredCoaches, setFilteredCoaches] = useState<Coach[]>([])
  const [events, setEvents]                   = useState<SportEvent[]>([])
  const [selectedInfra, setSelectedInfra]     = useState<Infrastructure | null>(null)
  const [selectedCoach, setSelectedCoach]     = useState<Coach | null>(null)
  // Centré sur Lille — Métropole Européenne de Lille (zone pilote)
  const [userLat, setUserLat] = useState(50.6292)
  const [userLng, setUserLng] = useState(3.0573)
  const [hasLocation, setHasLocation] = useState(false)
  const [sportFilter, setSportFilter]     = useState('all')
  const [statusFilter, setStatusFilter]   = useState('all')
  const [accessFilter, setAccessFilter]   = useState('all')
  const [distanceFilter, setDistanceFilter] = useState(0)  // 0 = all
  const [layerFilter, setLayerFilter]     = useState('infra')
  const [dataLoading, setDataLoading]     = useState(true)
  const [locating, setLocating]           = useState(false)

  // Géolocalisation uniquement via le bouton "Me localiser" — on garde Lille par défaut

  // ── Fetch all data ─────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getAuthToken() ?? ''
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
    Promise.all([
      fetch('/api/infrastructures').then((r) => r.json()),
      fetch('/api/events', { headers }).then((r) => r.json()),
      fetch('/api/coaches').then((r) => r.json()),
    ]).then(([infraRes, eventsRes, coachesRes]) => {
      setInfrastructures(infraRes.data ?? [])
      setEvents(eventsRes.data ?? [])
      setCoaches(coachesRes.data ?? [])
      setDataLoading(false)
    })
  }, [])

  // ── Compute distances + apply filters ─────────────────────────────────────
  useEffect(() => {
    // Infrastructures
    let infras = infrastructures.map((i) => ({
      ...i,
      distance: haversineDistance(userLat, userLng, i.lat, i.lng),
    }))
    if (sportFilter  !== 'all')     infras = infras.filter((i) => i.type === sportFilter)
    if (statusFilter !== 'all')     infras = infras.filter((i) => i.status === statusFilter)
    if (accessFilter === 'public')  infras = infras.filter((i) => i.is_public)
    if (accessFilter === 'private') infras = infras.filter((i) => !i.is_public)
    if (distanceFilter > 0)         infras = infras.filter((i) => (i.distance ?? 999) <= distanceFilter)
    infras.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
    setFilteredInfras(infras)

    // Coaches
    let coachs = coaches.map((c) => ({
      ...c,
      distance: (c.lat && c.lng) ? haversineDistance(userLat, userLng, c.lat, c.lng) : undefined,
    }))
    if (distanceFilter > 0) coachs = coachs.filter((c) => c.distance != null && c.distance <= distanceFilter)
    coachs.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))
    setFilteredCoaches(coachs)
  }, [infrastructures, coaches, userLat, userLng, sportFilter, statusFilter, accessFilter, distanceFilter])

  const handleInfraClick = useCallback((infra: Infrastructure) => {
    setSelectedCoach(null)
    setSelectedInfra(infra)
  }, [])

  const handleCoachClick = useCallback((coach: Coach) => {
    setSelectedInfra(null)
    setSelectedCoach(coach)
  }, [])

  const handleJoinEvent = useCallback(async (eventId: number) => {
    const token = getAuthToken()
    if (!token) { window.location.href = '/login'; return }
    await fetch(`/api/events/${eventId}/join`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    setSelectedInfra(null)
  }, [])

  function recenter() {
    setLocating(true)
    navigator.geolocation?.getCurrentPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setHasLocation(true); setLocating(false) },
      () => setLocating(false)
    )
  }

  const visibleCoaches = layerFilter === 'coaches' ? filteredCoaches : []
  const visibleInfras  = layerFilter !== 'coaches' ? filteredInfras : []

  const totalCount = layerFilter === 'coaches'
    ? filteredCoaches.length
    : filteredInfras.length

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-extrabold text-gray-900">Carte</h1>
          <div className="flex items-center gap-2">
            {hasLocation && (
              <div className="flex items-center gap-1.5 bg-blue-50 rounded-xl px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse-dot" />
                <span className="text-[10px] font-semibold text-blue-600">Localisé</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-2.5 py-1">
              <span className="text-xs font-semibold text-gray-600">
                {dataLoading ? '…' : `${totalCount} résultat${totalCount !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>
        </div>

        {/* Layer toggle */}
        <div className="flex gap-1.5 mb-2 bg-gray-100 p-1 rounded-2xl">
          {LAYER_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setLayerFilter(f.value)}
              className={cn(
                'flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all',
                layerFilter === f.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sport filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {SPORT_FILTERS.map((f) => (
            <FilterChip key={f.value} label={f.label} active={sportFilter === f.value} onClick={() => setSportFilter(f.value)} />
          ))}
        </div>

        {/* Status + Access + Distance */}
        <div className="flex gap-2 mt-1.5 overflow-x-auto scrollbar-none pb-1.5">
          {STATUS_FILTERS.map((f) => (
            <FilterChip key={f.value} label={f.label} active={statusFilter === f.value} onClick={() => setStatusFilter(f.value)} />
          ))}
          <div className="w-px bg-gray-200 flex-shrink-0" />
          {ACCESS_FILTERS.map((f) => (
            <FilterChip key={f.value} label={f.label} active={accessFilter === f.value} onClick={() => setAccessFilter(f.value)} />
          ))}
          <div className="w-px bg-gray-200 flex-shrink-0" />
          {DISTANCE_FILTERS.map((f) => (
            <FilterChip key={f.value} label={f.label} active={distanceFilter === f.value} onClick={() => setDistanceFilter(f.value)} />
          ))}
        </div>
      </div>

      {/* ── Map ── */}
      <div className="flex-1 relative overflow-hidden">
        <MapComponent
          infrastructures={visibleInfras}
          coaches={visibleCoaches}
          events={events}
          userLat={userLat}
          userLng={userLng}
          onInfrastructureClick={handleInfraClick}
          onCoachClick={handleCoachClick}
        />

        {/* Me localiser */}
        <button
          onClick={recenter}
          style={{ zIndex: 500 }}
          className="absolute bottom-5 left-4 h-11 px-4 bg-white rounded-2xl shadow-card flex items-center gap-2 active:scale-95 transition-transform"
        >
          {locating ? (
            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
          <span className="text-sm font-semibold text-gray-700">Me localiser</span>
        </button>

        {/* Bottom list : résultats proches */}
        {!selectedInfra && !selectedCoach && (
          <div className="absolute bottom-20 left-0 right-0 px-4" style={{ zIndex: 500 }}>
            {layerFilter === 'coaches' && filteredCoaches.length > 0 && (
              <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
                {filteredCoaches.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleCoachClick(c)}
                    className="flex-shrink-0 bg-white rounded-2xl shadow-card border border-gray-100 p-3 flex items-center gap-2 min-w-[160px]"
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {c.profile?.avatar_url ? (
                        <img src={c.profile.avatar_url} alt={c.profile.name} className="w-full h-full object-cover" />
                      ) : <div className="w-full h-full flex items-center justify-center bg-primary-50 text-primary-700 font-bold text-sm">{c.profile?.name?.[0] ?? 'C'}</div>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{c.profile?.name?.split(' ')[0]}</p>
                      <p className="text-[10px] text-primary-600 font-semibold">{c.hourly_rate}€/h</p>
                      {c.distance != null && (
                        <p className="text-[10px] text-gray-400">{c.distance < 1 ? `${Math.round(c.distance * 1000)}m` : `${c.distance.toFixed(1)}km`}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {layerFilter === 'infra' && filteredInfras.length > 0 && (
              <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
                {filteredInfras.slice(0, 5).map((i) => (
                  <button
                    key={i.id}
                    onClick={() => handleInfraClick(i)}
                    className="flex-shrink-0 bg-white rounded-2xl shadow-card border border-gray-100 p-3 flex items-center gap-2 min-w-[160px]"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary-50 flex-shrink-0">
                      <svg className="w-5 h-5 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{i.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {i.distance != null ? (i.distance < 1 ? `${Math.round(i.distance * 1000)}m` : `${i.distance.toFixed(1)}km`) : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Infrastructure sheet ── */}
      <InfrastructureSheet
        infrastructure={selectedInfra}
        events={events}
        onClose={() => setSelectedInfra(null)}
        onJoinEvent={handleJoinEvent}
      />

      {/* ── Coach sheet ── */}
      {selectedCoach && (
        <CoachSheet coach={selectedCoach} onClose={() => setSelectedCoach(null)} />
      )}

      <BottomNav />
    </div>
  )
}

