'use client'
import { cn } from '@/lib/utils'

const SPORT_FILTERS = [
  { value: 'all', label: 'Tous', icon: '🏅' },
  { value: 'football', label: 'Foot', icon: '⚽' },
  { value: 'basketball', label: 'Basket', icon: '🏀' },
  { value: 'tennis', label: 'Tennis', icon: '🎾' },
  { value: 'running', label: 'Running', icon: '🏃' },
  { value: 'swimming', label: 'Natation', icon: '🏊' },
  { value: 'gym', label: 'Gym', icon: '💪' },
  { value: 'padel', label: 'Padel', icon: '🏓' },
]

const STATUS_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'available', label: 'Disponible', color: 'bg-green-500' },
  { value: 'occupied', label: 'Occupé', color: 'bg-red-500' },
]

interface MapFiltersProps {
  selectedSport: string
  selectedStatus: string
  onSportChange: (sport: string) => void
  onStatusChange: (status: string) => void
}

export default function MapFilters({
  selectedSport,
  selectedStatus,
  onSportChange,
  onStatusChange,
}: MapFiltersProps) {
  return (
    <div className="absolute top-4 left-0 right-0 z-20 px-4 flex flex-col gap-2 pointer-events-none">
      {/* Sport filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 pointer-events-auto">
        {SPORT_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onSportChange(f.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-200 shadow-sm',
              selectedSport === f.value
                ? 'bg-primary-500 text-white shadow-primary-500/30 shadow-lg'
                : 'bg-white/95 text-gray-700 hover:bg-gray-50 backdrop-blur-sm'
            )}
          >
            <span>{f.icon}</span>
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 pointer-events-auto">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onStatusChange(f.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-200 shadow-sm',
              selectedStatus === f.value
                ? 'bg-gray-800 text-white shadow-lg'
                : 'bg-white/95 text-gray-700 hover:bg-gray-50 backdrop-blur-sm'
            )}
          >
            {f.color && (
              <span className={cn('w-2 h-2 rounded-full', f.color)} />
            )}
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
