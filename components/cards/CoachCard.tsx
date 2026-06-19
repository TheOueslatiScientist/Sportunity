import { Coach } from '@/types'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface CoachCardProps {
  coach: Coach
}

export default function CoachCard({ coach }: CoachCardProps) {
  return (
    <Link href={`/coaches/${coach.id}`} className="block">
      <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden hover:shadow-card-hover transition-all duration-300 active:scale-[0.98]">
        {/* Top accent band with sport color */}
        <div
          className="h-1.5 w-full"
          style={{ background: `linear-gradient(to right, ${coach.sport?.color ?? '#22c55e'}, ${coach.sport?.color ?? '#22c55e'}88)` }}
        />

        <div className="p-4">
          {/* Header row */}
          <div className="flex gap-3 mb-3">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100">
                {coach.profile?.avatar_url ? (
                  <img src={coach.profile.avatar_url} alt={coach.profile.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">{coach.sport?.icon ?? '💪'}</div>
                )}
              </div>
              {/* Available dot */}
              {coach.is_available_now && (
                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
              )}
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <h3 className="font-extrabold text-gray-900 text-base truncate">{coach.profile?.name}</h3>
                  <p className="text-xs text-gray-400 truncate">
                    {coach.sport?.icon} {coach.sport?.name}
                    {coach.city ? ` · ${coach.city}` : ''}
                  </p>
                </div>
                {/* Price badge */}
                <div className="flex-shrink-0 bg-primary-500 text-white rounded-2xl px-3 py-1.5 text-center ml-1">
                  <p className="text-sm font-extrabold leading-none">{coach.hourly_rate}€</p>
                  <p className="text-[9px] opacity-80 leading-none mt-0.5">/séance</p>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map((s) => (
                    <svg key={s} className={cn('w-3 h-3', s <= Math.round(coach.rating) ? 'text-yellow-400' : 'text-gray-200')}
                      fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <span className="text-xs font-bold text-gray-700">{coach.rating.toFixed(1)}</span>
                <span className="text-xs text-gray-400">({coach.reviews_count})</span>
              </div>
            </div>
          </div>

          {/* Bio */}
          {coach.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">{coach.description}</p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {coach.is_certified && (
              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">✅ Certifié</span>
            )}
            {coach.is_available_now && (
              <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse-dot" />
                Disponible
              </span>
            )}
            {coach.is_popular && (
              <span className="text-[10px] font-bold bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full">🔥 Populaire</span>
            )}
            {coach.distance != null && (
              <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                📍 {coach.distance < 1 ? `${Math.round(coach.distance * 1000)} m` : `${coach.distance.toFixed(1)} km`}
              </span>
            )}
            <span className="text-[10px] font-medium bg-gray-50 text-gray-600 px-2.5 py-1 rounded-full">
              {coach.experience_years} ans d&apos;exp.
            </span>
          </div>

          {/* Specialties chips */}
          {coach.specialties && coach.specialties.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-0.5">
              {coach.specialties.slice(0, 4).map((s) => (
                <span key={s} className="flex-shrink-0 text-[10px] font-medium bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* CTA footer */}
        <div className="border-t border-gray-50 px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {coach.clients_count ?? 0} élèves · {coach.sessions_count ?? 0} séances
          </span>
          <span className="text-xs font-bold text-primary-600 flex items-center gap-1">
            Voir le profil →
          </span>
        </div>
      </div>
    </Link>
  )
}
