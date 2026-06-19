import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Haversine distance in km between two lat/lng pairs */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`
  return `${km.toFixed(1)}km`
}

export function formatEventDate(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const hours = Math.floor(diff / 3600000)
  const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (hours < 0) return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + ' à ' + timeStr
  if (hours < 1) return `Dans moins d'1h · ${timeStr}`
  if (hours < 24) return `Aujourd'hui à ${timeStr}`
  const days = Math.floor(hours / 24)
  if (days === 1) return `Demain à ${timeStr}`
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + ' à ' + timeStr
}

export function levelLabel(level?: string): string {
  switch (level) {
    case 'beginner': return 'Débutant'
    case 'intermediate': return 'Intermédiaire'
    case 'advanced': return 'Avancé'
    case 'pro': return 'Pro'
    case 'all': return 'Tous niveaux'
    default: return level ?? ''
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'available': return 'text-green-500'
    case 'occupied': return 'text-red-500'
    case 'maintenance': return 'text-yellow-500'
    default: return 'text-gray-500'
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'available': return 'Disponible'
    case 'occupied': return 'Occupé'
    case 'maintenance': return 'En travaux'
    default: return status
  }
}

export function sportTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    football: 'Football',
    basketball: 'Basketball',
    tennis: 'Tennis',
    running: 'Running',
    gym: 'Gym / Fitness',
    swimming: 'Natation',
    volleyball: 'Volleyball',
    padel: 'Padel',
    other: 'Autre',
  }
  return labels[type] ?? type
}

export function sportTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    football: '⚽',
    basketball: '🏀',
    tennis: '🎾',
    running: '🏃',
    gym: '💪',
    swimming: '🏊',
    volleyball: '🏐',
    padel: '🏓',
    other: '🏅',
  }
  return icons[type] ?? '🏅'
}

export function sportTypeColor(type: string): string {
  const colors: Record<string, string> = {
    football: '#22c55e',
    basketball: '#f97316',
    tennis: '#eab308',
    running: '#3b82f6',
    gym: '#ef4444',
    swimming: '#06b6d4',
    volleyball: '#8b5cf6',
    padel: '#ec4899',
    other: '#64748b',
  }
  return colors[type] ?? '#64748b'
}
