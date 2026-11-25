'use client'
import { Infrastructure, SportEvent } from '@/types'
import Badge, { StatusBadge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { sportTypeIcon, sportTypeLabel, formatEventDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import TerrainStatusBadge from '@/components/TerrainStatusBadge'

interface InfrastructureSheetProps {
  infrastructure: Infrastructure | null
  events?: SportEvent[]
  userLat?: number
  userLng?: number
  routeInfo?: { distance: number; duration: number } | null
  onClose: () => void
  onJoinEvent?: (id: number) => void
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

          {/* Real-time occupancy */}
          <TerrainStatusBadge infrastructureId={infrastructure.id} />

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

          {/* Website link for private clubs */}
          {!infrastructure.is_public && (infrastructure as any).website_url && (
            <a
              href={(infrastructure as any).website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 hover:bg-blue-100 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-blue-800">Site officiel du club</p>
                <p className="text-xs text-blue-500 truncate">{(infrastructure as any).website_url.replace(/^https?:\/\//, '')}</p>
              </div>
              <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
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
