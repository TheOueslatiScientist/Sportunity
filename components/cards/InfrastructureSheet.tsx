'use client'
import { Infrastructure, SportEvent } from '@/types'
import Badge, { StatusBadge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { sportTypeIcon, sportTypeLabel, formatEventDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface InfrastructureSheetProps {
  infrastructure: Infrastructure | null
  events?: SportEvent[]
  userLat?: number
  userLng?: number
  routeInfo?: { distance: number; duration: number } | null
  onClose: () => void
  onJoinEvent?: (id: number) => void
}

// Deterministic occupancy based on infra id — stable across renders
function occupancyPercent(status: string, id: number): number {
  if (status === 'maintenance') return 0
  // Pseudo-random but stable: use id as seed
  const seed = (id * 37 + 13) % 100
  if (status === 'available') return (seed % 45) + 5    // 5–50%
  return (seed % 30) + 70                               // 70–99%
}

function OccupancyBar({ status, id }: { status: string; id: number }) {
  const pct = occupancyPercent(status, id)
  const color =
    pct < 40  ? 'bg-green-500' :
    pct < 75  ? 'bg-yellow-500' :
                'bg-red-500'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">Fréquentation actuelle</span>
        <span className="text-xs font-bold text-gray-700">{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}`
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

export default function InfrastructureSheet({
  infrastructure,
  events = [],
  userLat,
  userLng,
  routeInfo,
  onClose,
  onJoinEvent,
}: InfrastructureSheetProps) {
  const router = useRouter()

  if (!infrastructure) return null

  const relatedEvents = events.filter((e) => e.infrastructure_id === infrastructure.id)

  return (
    <>
      {/* ── Backdrop  (z-[200] to stay above Leaflet's max ~600, but below sheet) */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[1px] animate-fade-in"
        style={{ zIndex: 800 }}
        onClick={onClose}
      />

      {/* ── Sheet (z-[900]) */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slide-up overflow-y-auto"
        style={{ zIndex: 900, maxHeight: '78vh', paddingBottom: '96px' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Image */}
        {infrastructure.image_url && (
          <div className="mx-4 mt-1 rounded-2xl overflow-hidden h-36">
            <img
              src={infrastructure.image_url}
              alt={infrastructure.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-4 pt-3 flex flex-col gap-4">
          {/* Title & status */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{sportTypeIcon(infrastructure.type)}</span>
                <h2 className="font-extrabold text-gray-900 text-lg leading-tight">{infrastructure.name}</h2>
              </div>
              <p className="text-xs text-gray-400">{infrastructure.address}</p>
            </div>
            <StatusBadge status={infrastructure.status} />
          </div>

          {/* Tags row */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">{sportTypeLabel(infrastructure.type)}</Badge>
            <Badge variant={infrastructure.is_public ? 'success' : 'info'}>
              {infrastructure.is_public ? '🔓 Public' : '🔒 Privé'}
            </Badge>
            {relatedEvents.length > 0 && (
              <Badge variant="purple">⚡ {relatedEvents.length} événement{relatedEvents.length > 1 ? 's' : ''}</Badge>
            )}
          </div>

          {/* Occupancy */}
          <OccupancyBar status={infrastructure.status} id={infrastructure.id} />

          {/* Events at this venue */}
          {relatedEvents.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-900 text-sm mb-2">
                Événements ici
              </h3>
              <div className="flex flex-col gap-2">
                {relatedEvents.map((event) => {
                  const spotsLeft = event.max_participants - event.participants_count
                  const isFull = spotsLeft <= 0
                  return (
                    <div key={event.id} className="bg-gray-50 rounded-2xl p-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{ backgroundColor: (event.sport?.color ?? '#22c55e') + '20' }}
                        >
                          {event.sport?.icon ?? '🏅'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">{event.title}</p>
                          <p className="text-xs text-gray-400">
                            {formatEventDate(event.date)} ·{' '}
                            {isFull
                              ? <span className="text-red-500 font-medium">Complet</span>
                              : <span className="text-primary-600 font-medium">{spotsLeft} place{spotsLeft > 1 ? 's' : ''}</span>
                            }
                          </p>
                        </div>
                        {!isFull && onJoinEvent && (
                          <Button size="sm" onClick={() => onJoinEvent(event.id)}>
                            Rejoindre
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Route info banner */}
          {routeInfo && (
            <div className="flex items-center gap-3 bg-indigo-50 rounded-2xl px-4 py-3">
              <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-indigo-900">À pied</p>
                <p className="text-xs text-indigo-600">
                  {formatDistance(routeInfo.distance)} · {formatDuration(routeInfo.duration)}
                </p>
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col gap-3 pt-1">
            {/* Navigate button — always shown when user position is known */}
            {userLat != null && userLng != null && (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  const url = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${infrastructure.lat},${infrastructure.lng}&travelmode=walking`
                  window.open(url, '_blank')
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Naviguer vers ce terrain
                </span>
              </Button>
            )}
            {infrastructure.status === 'available' && (
              <Button
                fullWidth
                onClick={() => {
                  onClose()
                  router.push(`/events/new?infrastructure=${infrastructure.id}`)
                }}
              >
                Créer un événement ici
              </Button>
            )}
            <Button variant="secondary" fullWidth onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
