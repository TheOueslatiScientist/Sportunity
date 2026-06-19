'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Coach } from '@/types'
import ContactModal from '@/components/coaches/ContactModal'
import BookingModal from '@/components/coaches/BookingModal'
import { cn, levelLabel } from '@/lib/utils'
import { getStoredUser } from '@/lib/client-utils'
import Link from 'next/link'

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((star) => (
        <svg key={star} className={cn('w-4 h-4', star <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-200')}
          fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

export default function CoachProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [coach, setCoach] = useState<Coach | null>(null)
  const [loading, setLoading] = useState(true)
  const [showContact, setShowContact] = useState(false)
  const [showBooking, setShowBooking] = useState(false)
  const [activeTab, setActiveTab] = useState<'about' | 'availability'>('about')
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  useEffect(() => {
    const u = getStoredUser()
    if (u) setCurrentUserId(u.id)
  }, [])

  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/coaches/${id}`)
        .then((r) => r.json())
        .then((d) => { setCoach(d.data ?? null); setLoading(false) })
    })
  }, [params])

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-9 h-9 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!coach) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-5xl">🔍</p>
      <p className="font-bold text-gray-900">Coach introuvable</p>
      <button onClick={() => router.back()} className="text-primary-600 text-sm font-semibold">← Retour</button>
    </div>
  )

  const DAY_LABELS: Record<string, string> = {
    lun: 'Lun', mar: 'Mar', mer: 'Mer', jeu: 'Jeu', ven: 'Ven', sam: 'Sam', dim: 'Dim',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="relative">
        {/* Banner */}
        <div className="h-48 bg-gradient-to-br from-primary-600 to-emerald-400 overflow-hidden">
          {coach.gallery?.[0] && (
            <img src={coach.gallery[0]} alt="" className="w-full h-full object-cover opacity-40" />
          )}
        </div>

        {/* Back button */}
        <button onClick={() => router.back()}
          className="absolute top-12 left-4 w-10 h-10 bg-white/90 rounded-2xl backdrop-blur flex items-center justify-center shadow-card" aria-label="Retour">
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Avatar */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-gray-100">
            {coach.profile?.avatar_url ? (
              <img src={coach.profile.avatar_url} alt={coach.profile.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">{coach.sport?.icon}</div>
            )}
          </div>
        </div>
        {/* Dashboard button — own profile only */}
        {coach.user_id === currentUserId && (
          <Link href="/coach/dashboard"
            className="absolute top-12 right-4 flex items-center gap-1.5 bg-white/90 backdrop-blur rounded-2xl px-3 py-2 shadow-card text-xs font-bold text-primary-600">
            📊 Dashboard
          </Link>
        )}
      </div>

      {/* Identity */}
      <div className="pt-16 pb-4 px-4 text-center">
        <h1 className="text-2xl font-extrabold text-gray-900">{coach.profile?.name}</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {coach.sport?.icon} Coach {coach.sport?.name} · {coach.city ?? coach.profile?.city}
        </p>

        {/* Badges */}
        <div className="flex justify-center gap-2 mt-3 flex-wrap">
          {coach.is_certified && (
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              ✅ Coach certifié
            </span>
          )}
          {coach.is_available_now && (
            <span className="bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse-dot" />
              Disponible
            </span>
          )}
          {coach.is_popular && (
            <span className="bg-orange-50 text-orange-700 text-xs font-bold px-3 py-1 rounded-full">
              🔥 Très demandé
            </span>
          )}
        </div>

        {/* Rating */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <StarRating rating={coach.rating} />
          <span className="text-sm font-bold text-gray-800">{coach.rating.toFixed(1)}</span>
          <span className="text-xs text-gray-400">({coach.reviews_count} avis)</span>
        </div>
      </div>

      {/* Stats strip */}
      <div className="mx-4 bg-white rounded-3xl shadow-card border border-gray-100 grid grid-cols-3 divide-x divide-gray-100 mb-5">
        {[
          { value: `${coach.experience_years} ans`, label: 'Expérience' },
          { value: `${coach.clients_count ?? 0}`, label: 'Élèves' },
          { value: `${coach.hourly_rate}€`, label: 'Par séance' },
        ].map((stat) => (
          <div key={stat.label} className="py-4 text-center">
            <p className="text-lg font-extrabold text-primary-600">{stat.value}</p>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mx-4 flex bg-gray-100 rounded-2xl p-1 mb-4">
        {(['about', 'availability'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn('flex-1 py-2 rounded-xl text-xs font-bold transition-all',
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>
            {tab === 'about' ? 'À propos' : 'Disponibilités'}
          </button>
        ))}
      </div>

      <div className="px-4 pb-36">
        {/* ── ABOUT TAB ── */}
        {activeTab === 'about' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {/* Bio */}
            <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-4">
              <h3 className="font-bold text-gray-900 text-sm mb-2">À propos</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{coach.description}</p>
            </div>

            {/* Specialties */}
            {coach.specialties && coach.specialties.length > 0 && (
              <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-4">
                <h3 className="font-bold text-gray-900 text-sm mb-3">Spécialités</h3>
                <div className="flex flex-wrap gap-2">
                  {coach.specialties.map((s) => (
                    <span key={s} className="bg-primary-50 text-primary-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {coach.certifications && coach.certifications.length > 0 && (
              <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-4">
                <h3 className="font-bold text-gray-900 text-sm mb-3">Diplômes & certifications</h3>
                <div className="flex flex-col gap-2">
                  {coach.certifications.map((c) => (
                    <div key={c} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-xs">🎓</div>
                      <span className="text-sm text-gray-700 font-medium">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {coach.languages && coach.languages.length > 0 && (
              <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-4">
                <h3 className="font-bold text-gray-900 text-sm mb-2">Langues</h3>
                <div className="flex gap-2">
                  {coach.languages.map((l) => (
                    <span key={l} className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full">{l}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {coach.gallery && coach.gallery.length > 1 && (
              <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-4">
                <h3 className="font-bold text-gray-900 text-sm mb-3">Photos</h3>
                <div className="flex gap-3 overflow-x-auto scrollbar-none">
                  {coach.gallery.map((url, i) => (
                    <div key={i} className="flex-shrink-0 w-40 h-28 rounded-2xl overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── AVAILABILITY TAB ── */}
        {activeTab === 'availability' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-4">
              <h3 className="font-bold text-gray-900 text-sm mb-1">Créneaux disponibles</h3>
              {coach.availability_text && (
                <p className="text-xs text-gray-400 mb-4">{coach.availability_text}</p>
              )}
              {coach.availability && coach.availability.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {coach.availability.map((slot) => (
                    <div key={slot.day}>
                      <p className="text-xs font-bold text-gray-500 mb-1.5">{DAY_LABELS[slot.day]}</p>
                      <div className="flex flex-wrap gap-2">
                        {slot.slots.map((s) => (
                          <span key={s} className="bg-primary-50 text-primary-700 text-xs font-semibold px-3 py-1.5 rounded-xl">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Contacte le coach pour connaître ses disponibilités.</p>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-100 rounded-3xl p-4 text-sm text-yellow-800">
              <p className="font-bold mb-1">💡 Comment réserver ?</p>
              <p className="text-xs leading-relaxed">Clique sur "Réserver" pour choisir un créneau. Le coach confirmera par message dans les 24h.</p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom CTAs */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-100 p-4 flex gap-3" style={{ zIndex: 500 }}>
        <button
          onClick={() => setShowContact(true)}
          className="flex-1 py-3.5 rounded-2xl border-2 border-primary-500 text-primary-600 font-bold text-sm hover:bg-primary-50 transition-colors active:scale-95"
        >
          💬 Contacter
        </button>
        <button
          onClick={() => setShowBooking(true)}
          className="flex-1 py-3.5 rounded-2xl bg-primary-500 text-white font-bold text-sm shadow-lg shadow-primary-500/30 hover:bg-primary-600 transition-colors active:scale-95"
        >
          📅 Réserver
        </button>
      </div>

      {/* Modals */}
      {showContact && <ContactModal coach={coach} onClose={() => setShowContact(false)} />}
      {showBooking && <BookingModal coach={coach} onClose={() => setShowBooking(false)} />}
    </div>
  )
}
