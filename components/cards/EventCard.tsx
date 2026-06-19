'use client'
import { SportEvent } from '@/types'
import { formatEventDate, levelLabel, cn } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

interface EventCardProps {
  event: SportEvent
  onJoin?: (id: number) => void
  onLeave?: (id: number) => void
  joining?: boolean
  leaving?: boolean
  currentUserId?: number
}

export default function EventCard({ event, onJoin, onLeave, joining, leaving, currentUserId }: EventCardProps) {
  const spotsLeft = event.max_participants - event.participants_count
  const isFull = spotsLeft <= 0
  const isParticipant = event.participants?.some((p) => p.user_id === currentUserId)

  return (
    <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden hover:shadow-card-hover transition-all duration-300 active:scale-[0.98]">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: (event.sport?.color ?? '#22c55e') + '20' }}
            >
              {event.sport?.icon ?? '🏅'}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{event.title}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{event.sport?.name}</p>
            </div>
          </div>
          {event.level && (
            <Badge variant={
              event.level === 'beginner' ? 'success' :
              event.level === 'advanced' || event.level === 'intermediate' ? 'info' : 'default'
            }>
              {levelLabel(event.level)}
            </Badge>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="px-4 pb-3 flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <svg className="w-3.5 h-3.5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{formatEventDate(event.date)}</span>
        </div>
        {event.infrastructure && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span className="truncate max-w-[140px]">{event.infrastructure.name}</span>
          </div>
        )}
      </div>

      {/* Participants bar */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1">
            {/* Avatar stack */}
            <div className="flex -space-x-2">
              {(event.participants ?? []).slice(0, 3).map((p, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full border-2 border-white bg-primary-100 flex items-center justify-center text-[10px] font-bold text-primary-600 overflow-hidden"
                >
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    p.name[0]
                  )}
                </div>
              ))}
            </div>
            <span className="text-xs text-gray-500 ml-1">
              {event.participants_count}/{event.max_participants}
            </span>
          </div>
          <span className={cn('text-xs font-semibold', isFull ? 'text-red-500' : 'text-primary-600')}>
            {isFull ? 'Complet' : `${spotsLeft} place${spotsLeft > 1 ? 's' : ''} restante${spotsLeft > 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', isFull ? 'bg-red-400' : 'bg-primary-500')}
            style={{ width: `${(event.participants_count / event.max_participants) * 100}%` }}
          />
        </div>

        {onJoin && !isParticipant && !isFull && (
          <Button
            fullWidth
            size="sm"
            className="mt-3"
            loading={joining}
            onClick={() => onJoin(event.id)}
          >
            Rejoindre l&apos;événement
          </Button>
        )}
        {isParticipant && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 text-center text-xs font-semibold text-primary-500 bg-primary-50 rounded-xl py-2">
              ✅ Vous participez
            </div>
            {onLeave && (
              <Button
                variant="secondary"
                size="sm"
                loading={leaving}
                onClick={() => onLeave(event.id)}
                className="text-red-500 border-red-100 hover:bg-red-50"
              >
                Quitter
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
