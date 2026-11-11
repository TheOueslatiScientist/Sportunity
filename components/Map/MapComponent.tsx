'use client'
import { useEffect, useRef, useState } from 'react'
import { Infrastructure, SportEvent, Coach } from '@/types'
import { sportTypeColor } from '@/lib/utils'

const SPORT_INITIALS: Record<string, string> = {
  football: 'F', basketball: 'B', tennis: 'T', running: 'R',
  gym: 'G', swimming: 'N', volleyball: 'V', padel: 'P', other: '?',
}

interface MapComponentProps {
  infrastructures: Infrastructure[]
  coaches?: Coach[]
  events?: SportEvent[]
  userLat?: number
  userLng?: number
  onInfrastructureClick?: (infra: Infrastructure) => void
  onCoachClick?: (coach: Coach) => void
}

export default function MapComponent({
  infrastructures,
  coaches = [],
  events = [],
  userLat = 48.8566,
  userLng = 2.3522,
  onInfrastructureClick,
  onCoachClick,
}: MapComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('leaflet').Map | null>(null)
  const markersRef = useRef<import('leaflet').Marker[]>([])
  const coachMarkersRef = useRef<import('leaflet').Marker[]>([])
  const userMarkerRef = useRef<import('leaflet').Marker | null>(null)
  const onClickRef = useRef(onInfrastructureClick)
  const onCoachClickRef = useRef(onCoachClick)
  const [ready, setReady] = useState(false)

  useEffect(() => { onClickRef.current = onInfrastructureClick }, [onInfrastructureClick])
  useEffect(() => { onCoachClickRef.current = onCoachClick }, [onCoachClick])

  // ── Init map (once) ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return
      // @ts-expect-error – internal Leaflet check
      if (containerRef.current._leaflet_id) return

      // @ts-expect-error – override
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current, {
        center: [userLat, userLng],
        zoom: 13,
        zoomControl: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)

      // User dot
      const userIcon = L.divIcon({
        html: `<div style="width:20px;height:20px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 2px 12px rgba(59,130,246,.6)">
                 <div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(59,130,246,.2);animation:ping 1.5s infinite"></div>
               </div>`,
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })
      const userMarker = L.marker([userLat, userLng], { icon: userIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup('<strong>Vous êtes ici</strong>')
      userMarkerRef.current = userMarker

      mapRef.current = map
      setReady(true)
    })

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Update user marker position ────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current || !userMarkerRef.current) return
    userMarkerRef.current.setLatLng([userLat, userLng])
  }, [ready, userLat, userLng])

  // ── Infrastructure markers ─────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return

    import('leaflet').then((L) => {
      if (!mapRef.current) return

      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      infrastructures.forEach((infra) => {
        const color   = sportTypeColor(infra.type)
        const initial = SPORT_INITIALS[infra.type] ?? '?'
        const eventsHere = events.filter((e) => e.infrastructure_id === infra.id).length

        const statusColor =
          infra.status === 'available' ? '#22c55e' :
          infra.status === 'occupied'  ? '#ef4444' : '#f59e0b'

        const badgeHtml = eventsHere > 0
          ? `<div style="position:absolute;bottom:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:#22c55e;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff">${eventsHere}</div>`
          : ''

        const markerHtml = `
          <div style="position:relative;width:44px;height:52px;display:flex;flex-direction:column;align-items:center;cursor:pointer">
            <div style="width:44px;height:44px;border-radius:14px;background:${color}22;border:2.5px solid ${color}66;
              display:flex;align-items:center;justify-content:center;position:relative;
              box-shadow:0 4px 12px ${color}30;">
              <span style="font-size:16px;font-weight:800;color:${color};font-family:system-ui,sans-serif;line-height:1">${initial}</span>
              <div style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;border-radius:50%;background:${statusColor};border:2.5px solid #fff"></div>
              ${badgeHtml}
            </div>
            <div style="width:8px;height:8px;background:${color}44;transform:rotate(45deg);margin-top:-4px"></div>
          </div>`

        const leafletIcon = L.divIcon({ html: markerHtml, className: '', iconSize: [44, 52], iconAnchor: [22, 52] })
        const marker = L.marker([infra.lat, infra.lng], { icon: leafletIcon })
        marker.addTo(mapRef.current!)
        marker.on('click', () => onClickRef.current?.(infra))
        markersRef.current.push(marker)
      })
    })
  }, [ready, infrastructures, events])

  // ── Coach markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return

    import('leaflet').then((L) => {
      if (!mapRef.current) return

      coachMarkersRef.current.forEach((m) => m.remove())
      coachMarkersRef.current = []

      coaches.forEach((coach) => {
        if (!coach.lat || !coach.lng) return

        const sportColor = coach.sport?.color ?? '#8b5cf6'
        const availDot   = coach.is_available_now ? '#22c55e' : '#9ca3af'
        const nameInitial = (coach.profile?.name ?? coach.sport?.name ?? 'C').charAt(0).toUpperCase()
        const avatar     = coach.profile?.avatar_url
          ? `<img src="${coach.profile.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover"/>`
          : `<span style="font-size:16px;font-weight:800;color:${sportColor};font-family:system-ui,sans-serif;line-height:1">${nameInitial}</span>`

        const markerHtml = `
          <div style="position:relative;width:44px;height:54px;display:flex;flex-direction:column;align-items:center;cursor:pointer">
            <div style="width:44px;height:44px;border-radius:50%;background:white;border:3px solid ${sportColor};
              display:flex;align-items:center;justify-content:center;overflow:hidden;
              box-shadow:0 4px 14px rgba(0,0,0,.2);">
              ${avatar}
              <div style="position:absolute;bottom:0;right:0;width:13px;height:13px;border-radius:50%;background:${availDot};border:2px solid #fff"></div>
            </div>
            <div style="background:${sportColor};color:white;font-size:9px;font-weight:700;padding:1px 5px;border-radius:6px;margin-top:2px;white-space:nowrap;max-width:60px;overflow:hidden;text-overflow:ellipsis">
              ${coach.hourly_rate}€/h
            </div>
          </div>`

        const leafletIcon = L.divIcon({ html: markerHtml, className: '', iconSize: [44, 54], iconAnchor: [22, 54] })
        const marker = L.marker([coach.lat, coach.lng], { icon: leafletIcon, zIndexOffset: 500 })
        marker.addTo(mapRef.current!)
        marker.on('click', () => onCoachClickRef.current?.(coach))
        coachMarkersRef.current.push(marker)
      })
    })
  }, [ready, coaches])

  return (
    <div className="relative w-full h-full">
      {!ready && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-9 h-9 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">Chargement de la carte…</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
