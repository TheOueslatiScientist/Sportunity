'use client'
import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Sport } from '@/types'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getStoredUser, getAuthToken } from '@/lib/client-utils'

const SPECIALTY_OPTIONS = [
  'Perte de poids', 'Remise en forme', 'Préparation physique',
  'Nutrition', 'Débutants', 'Jeunes', 'Compétition', 'Technique',
  'Cardio', 'Renforcement musculaire', 'Souplesse', 'Rééducation',
  'Nage en eau libre', 'Double mixte', 'Aquafitness',
]

const CERTIFICATION_OPTIONS = [
  'BPJEPS', 'DEJEPS', 'DESJEPS', 'CQP',
  'CrossFit Level 1', 'CrossFit Level 2',
  'Maître Nageur BEESAN', 'Moniteur Tennis FFT',
  'Diplôme Fédéral', 'Nutrition sportive',
]

export default function BecomeCoachPage() {
  const router = useRouter()
  const [sports, setSports] = useState<Sport[]>([])
  const [step, setStep] = useState(1)
  const TOTAL_STEPS = 3

  // Form state
  const [sportId, setSportId]             = useState<number | ''>('')
  const [bio, setBio]                     = useState('')
  const [experience, setExperience]       = useState('')
  const [hourlyRate, setHourlyRate]       = useState('')
  const [city, setCity]                   = useState('')
  const [specialties, setSpecialties]     = useState<string[]>([])
  const [certifications, setCertifications] = useState<string[]>([])
  const [availabilityText, setAvailabilityText] = useState('')
  const [isAvailableNow, setIsAvailableNow] = useState(true)

  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [coachLat, setCoachLat]     = useState<number | null>(null)
  const [coachLng, setCoachLng]     = useState<number | null>(null)
  const [locating, setLocating]     = useState(false)

  useEffect(() => {
    fetch('/api/sports').then((r) => r.json()).then((d) => setSports(d.data ?? []))
    const user = getStoredUser()
    if (user) setCity(user.city ?? '')
    // Try geolocation
    navigator.geolocation?.getCurrentPosition(
      (pos) => { setCoachLat(pos.coords.latitude); setCoachLng(pos.coords.longitude) },
      () => {}
    )
  }, [])

  function geolocate() {
    setLocating(true)
    navigator.geolocation?.getCurrentPosition(
      (pos) => { setCoachLat(pos.coords.latitude); setCoachLng(pos.coords.longitude); setLocating(false) },
      () => setLocating(false)
    )
  }

  function toggleSpecialty(s: string) {
    setSpecialties((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }
  function toggleCert(c: string) {
    setCertifications((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!sportId || !bio || !hourlyRate || !experience) {
      setError('Merci de remplir tous les champs obligatoires.')
      return
    }
    const token = getAuthToken()
    if (!token) { router.push('/login'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/coaches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sport_id: sportId,
          description: bio,
          experience_years: parseInt(experience),
          hourly_rate: parseFloat(hourlyRate),
          city,
          lat: coachLat,
          lng: coachLng,
          certifications,
          specialties,
          availability_text: availabilityText,
          is_available_now: isAvailableNow,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push(`/coaches/${data.data.id}`)
    } catch {
      setError('Erreur réseau, réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const canProceed =
    step === 1 ? (sportId !== '' && bio.trim().length > 10 && experience !== '' && hourlyRate !== '') :
    step === 2 ? true :
    true

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : router.back()}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Devenir coach</h1>
            <p className="text-xs text-gray-400">Étape {step}/{TOTAL_STEPS}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-500"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="px-4 py-6 max-w-lg mx-auto pb-32">

          {/* ── STEP 1 : Infos essentielles ── */}
          {step === 1 && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <div className="text-center mb-2">
                <span className="text-4xl">🏅</span>
                <h2 className="text-lg font-extrabold text-gray-900 mt-2">Tes informations</h2>
                <p className="text-sm text-gray-400">Parle-nous de ton expertise</p>
              </div>

              {/* Sport */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Sport principal *</label>
                <div className="grid grid-cols-4 gap-2">
                  {sports.map((s) => (
                    <button key={s.id} type="button" onClick={() => setSportId(s.id)}
                      className={cn('flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all',
                        sportId === s.id ? 'border-primary-500 bg-primary-50' : 'border-gray-100 bg-white hover:border-gray-200')}>
                      <span className="text-2xl">{s.icon}</span>
                      <span className="text-[10px] font-medium text-gray-600 truncate w-full text-center">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Input label="Années d'expérience *" type="number" min="0" max="40"
                placeholder="ex : 5" value={experience} onChange={(e) => setExperience(e.target.value)} />

              <Input label="Tarif par séance (€) *" type="number" min="10" max="500"
                placeholder="ex : 60" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Ville *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paris 15e"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                  />
                  <button
                    type="button"
                    onClick={geolocate}
                    title="Utiliser ma position"
                    className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0 hover:bg-blue-100 transition-colors"
                  >
                    {locating ? (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className={cn('w-5 h-5', coachLat ? 'text-blue-500' : 'text-gray-400')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                {coachLat && (
                  <p className="text-[11px] text-blue-500 mt-1 font-medium">
                    ✓ Position GPS enregistrée ({coachLat.toFixed(4)}, {coachLng?.toFixed(4)})
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Bio / Présentation *</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
                  placeholder="Décris ton parcours, ta méthode, ce que tes élèves peuvent attendre de toi…"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none" />
              </div>
            </div>
          )}

          {/* ── STEP 2 : Spécialités & certifications ── */}
          {step === 2 && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <div className="text-center mb-2">
                <span className="text-4xl">🎓</span>
                <h2 className="text-lg font-extrabold text-gray-900 mt-2">Spécialités & diplômes</h2>
                <p className="text-sm text-gray-400">Optionnel mais recommandé</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Tes spécialités</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTY_OPTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => toggleSpecialty(s)}
                      className={cn('px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all',
                        specialties.includes(s) ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Certifications & diplômes</label>
                <div className="flex flex-wrap gap-2">
                  {CERTIFICATION_OPTIONS.map((c) => (
                    <button key={c} type="button" onClick={() => toggleCert(c)}
                      className={cn('px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all',
                        certifications.includes(c) ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3 : Disponibilités ── */}
          {step === 3 && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <div className="text-center mb-2">
                <span className="text-4xl">📅</span>
                <h2 className="text-lg font-extrabold text-gray-900 mt-2">Tes disponibilités</h2>
                <p className="text-sm text-gray-400">Pour que les élèves sachent quand te contacter</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Créneaux disponibles</label>
                <textarea value={availabilityText} onChange={(e) => setAvailabilityText(e.target.value)} rows={3}
                  placeholder="ex : Lun–Ven 7h–20h, Sam 8h–14h"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none" />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">Disponible maintenant ?</label>
                <div className="flex gap-3">
                  {[{v: true, label: '✅ Oui, dispo'}, {v: false, label: '⏳ Pas actuellement'}].map(({v, label}) => (
                    <button key={label} type="button" onClick={() => setIsAvailableNow(v)}
                      className={cn('flex-1 py-3 rounded-2xl text-sm font-semibold transition-all border-2',
                        isAvailableNow === v ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-100 bg-white text-gray-600')}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-600 flex flex-col gap-1.5">
                <p className="font-bold text-gray-900 mb-1">Résumé de ton profil</p>
                <p>🏅 Sport : {sports.find(s => s.id === sportId)?.name}</p>
                <p>⏱ Expérience : {experience} ans</p>
                <p>💶 Tarif : {hourlyRate}€/séance</p>
                <p>📍 Ville : {city}</p>
                {certifications.length > 0 && <p>🎓 {certifications.join(', ')}</p>}
                {specialties.length > 0 && <p>⭐ {specialties.slice(0, 3).join(', ')}{specialties.length > 3 ? '…' : ''}</p>}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3">{error}</div>
              )}
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
          {step < TOTAL_STEPS ? (
            <Button type="button" fullWidth size="lg" disabled={!canProceed} onClick={() => setStep(s => s + 1)}>
              Continuer →
            </Button>
          ) : (
            <Button type="submit" fullWidth size="lg" loading={loading}>
              Créer mon profil coach 🚀
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
