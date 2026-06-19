'use client'
import { useState, useEffect } from 'react'
import { Profile, Friendship } from '@/types'
type ProfileType = Profile
import BottomNav from '@/components/BottomNav'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { levelLabel } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Cookies from 'js-cookie'
import { getStoredUser, getAuthToken } from '@/lib/client-utils'

// ─── Friends section ──────────────────────────────────────────────────────────
function FriendsSection() {
  const [accepted, setAccepted] = useState<(Friendship & { friend?: ProfileType })[]>([])
  const [pendingReceived, setPendingReceived] = useState<(Friendship & { friend?: ProfileType })[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)

  useEffect(() => {
    loadFriends()
  }, [])

  async function loadFriends() {
    const token = getAuthToken()
    if (!token) { setLoading(false); return }
    try {
      const res = await fetch('/api/friends', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setAccepted(data.data.accepted ?? [])
        setPendingReceived(data.data.pending_received ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function acceptRequest(friendship: Friendship & { friend?: ProfileType }) {
    const token = getAuthToken()
    if (!token) return
    setActionId(friendship.id)
    const res = await fetch(`/api/friends/${friendship.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'accept' }),
    })
    if (res.ok) await loadFriends()
    setActionId(null)
  }

  async function rejectRequest(friendship: Friendship) {
    const token = getAuthToken()
    if (!token) return
    setActionId(friendship.id)
    await fetch(`/api/friends/${friendship.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    await loadFriends()
    setActionId(null)
  }

  return (
    <div className="px-4 mt-4">
      {/* Pending requests */}
      {pendingReceived.length > 0 && (
        <div className="mb-4">
          <h3 className="font-bold text-gray-900 mb-3">
            Demandes d&apos;amis <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingReceived.length}</span>
          </h3>
          <div className="flex flex-col gap-2">
            {pendingReceived.map((f) => (
              <div key={f.id} className="bg-white rounded-2xl shadow-card border border-gray-100 p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  <img
                    src={f.friend?.avatar_url ?? `https://api.dicebear.com/8.x/avataaars/svg?seed=${f.friend?.name}`}
                    alt={f.friend?.name ?? ''}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{f.friend?.name}</p>
                  <p className="text-xs text-gray-400">{f.friend?.city ?? 'Souhaite devenir ami'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptRequest(f)}
                    disabled={actionId === f.id}
                    className="px-3 py-1.5 bg-primary-500 text-white text-xs font-bold rounded-xl disabled:opacity-50"
                  >
                    Accepter
                  </button>
                  <button
                    onClick={() => rejectRequest(f)}
                    disabled={actionId === f.id}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl disabled:opacity-50"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900">Mes amis {!loading && `(${accepted.length})`}</h3>
      </div>

      {loading ? (
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-16 h-16 rounded-2xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : accepted.length === 0 ? (
        <div className="bg-white rounded-2xl p-4 text-center text-sm text-gray-400 shadow-card">
          <p className="text-2xl mb-1">👥</p>
          <p>Tu n&apos;as pas encore d&apos;amis. Trouve des sportifs près de toi !</p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
          {accepted.map((f) => (
            <a key={f.id} href={`/users/${f.friend?.user_id}`} className="flex-shrink-0 flex flex-col items-center gap-1 w-16">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 border-2 border-white shadow-card">
                <img
                  src={f.friend?.avatar_url ?? `https://api.dicebear.com/8.x/avataaars/svg?seed=${f.friend?.name}`}
                  alt={f.friend?.name ?? ''}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[10px] text-gray-500 font-medium text-center truncate w-full">
                {f.friend?.name?.split(' ')[0]}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

const SPORTS_LIST = [
  { id: 1, name: 'Football', icon: '⚽', color: '#22c55e' },
  { id: 2, name: 'Basketball', icon: '🏀', color: '#f97316' },
  { id: 3, name: 'Tennis', icon: '🎾', color: '#eab308' },
  { id: 4, name: 'Running', icon: '🏃', color: '#3b82f6' },
  { id: 5, name: 'Natation', icon: '🏊', color: '#06b6d4' },
  { id: 6, name: 'Volleyball', icon: '🏐', color: '#8b5cf6' },
  { id: 7, name: 'Padel', icon: '🏓', color: '#ec4899' },
  { id: 8, name: 'Gym / Fitness', icon: '💪', color: '#ef4444' },
]

const LEVELS = ['beginner', 'intermediate', 'advanced', 'pro'] as const

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [level, setLevel] = useState<string>('intermediate')
  const [city, setCity] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const u = getStoredUser()
    if (!u) { router.push('/login'); return }

    import('@/lib/mock-data').then(({ PROFILES }) => {
      const p: Profile = PROFILES.find((pr) => pr.user_id === u.id) ?? {
        id: 0,
        user_id: u.id,
        name: u.name ?? u.email,
        avatar_url: `https://api.dicebear.com/8.x/avataaars/svg?seed=${u.name ?? u.email}`,
        is_coach: false,
        email: u.email,
        bio: undefined,
        level: undefined,
        city: undefined,
      }
      setProfile(p)
      setName(p.name)
      setBio(p.bio ?? '')
      setLevel(p.level ?? 'intermediate')
      setCity(p.city ?? '')
    })
  }, [router])

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    const token = getAuthToken()
    await fetch(`/api/users/${profile.user_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, bio, level, city }),
    })
    setProfile((p) => p ? { ...p, name, bio, level: level as Profile['level'], city } : p)
    setEditing(false)
    setSaving(false)
  }

  function logout() {
    Cookies.remove('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (!profile) return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-900">Mon profil</h1>
        <button onClick={logout} className="text-sm text-red-500 font-semibold">
          Déconnexion
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Avatar & name */}
        <div className="bg-white px-4 py-6 flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl overflow-hidden bg-gray-100 shadow-card">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">
                  {profile.name[0]}
                </div>
              )}
            </div>
            {profile.is_coach && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-purple-500 rounded-xl border-2 border-white flex items-center justify-center">
                <span className="text-white text-xs">🏅</span>
              </div>
            )}
          </div>

          {!editing ? (
            <>
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
                {profile.city && <p className="text-sm text-gray-400">{profile.city}</p>}
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {profile.level && <Badge variant="info">{levelLabel(profile.level)}</Badge>}
                {profile.is_coach && <Badge variant="purple">Coach</Badge>}
              </div>
              {profile.bio && <p className="text-sm text-gray-500 text-center max-w-xs">{profile.bio}</p>}
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                Modifier le profil
              </Button>
            </>
          ) : (
            <div className="w-full max-w-sm flex flex-col gap-4 mt-2">
              <Input label="Nom" value={name} onChange={(e) => setName(e.target.value)} />
              <Input label="Ville" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" />
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Niveau</label>
                <div className="flex flex-wrap gap-2">
                  {LEVELS.map((l) => (
                    <button
                      key={l}
                      onClick={() => setLevel(l)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        level === l ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {levelLabel(l)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Parle un peu de toi…"
                  rows={3}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setEditing(false)} fullWidth>Annuler</Button>
                <Button onClick={saveProfile} loading={saving} fullWidth>Sauvegarder</Button>
              </div>
            </div>
          )}
        </div>

        {/* Sports */}
        <div className="px-4 mt-4">
          <h3 className="font-bold text-gray-900 mb-3">Mes sports</h3>
          <div className="grid grid-cols-4 gap-2">
            {SPORTS_LIST.map((s) => {
              const active = profile.sports?.some((ps) => ps.id === s.id)
              return (
                <div
                  key={s.id}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all ${
                    active ? 'border-primary-300 bg-primary-50' : 'border-gray-100 bg-white opacity-40'
                  }`}
                >
                  <span className="text-2xl">{s.icon}</span>
                  <span className="text-[10px] font-medium text-gray-600 truncate w-full text-center">{s.name}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Stats + Friends */}
        <FriendsSection />

        {/* Become coach CTA */}
        {!profile.is_coach && (
          <div className="px-4 mt-5">
            <Link href="/coaches/become"
              className="block bg-gradient-to-r from-primary-500 to-emerald-500 rounded-3xl p-4 text-white shadow-lg shadow-primary-500/20 active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">🏅</div>
                <div>
                  <p className="font-extrabold text-sm">Devenir coach sur Sportunity</p>
                  <p className="text-xs text-white/75 mt-0.5">Partage ton expertise et trouve des élèves</p>
                </div>
              </div>
              <div className="mt-3 bg-white/25 rounded-2xl py-2 text-center text-xs font-bold">
                Créer mon profil coach →
              </div>
            </Link>
          </div>
        )}

        {/* If already coach — dashboard + profile links */}
        {profile.is_coach && (
          <div className="px-4 mt-5 flex flex-col gap-3">
            <Link href="/coach/dashboard"
              className="block bg-gradient-to-r from-primary-500 to-emerald-500 rounded-3xl p-4 text-white shadow-lg shadow-primary-500/20 active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl flex-shrink-0">📊</div>
                <div>
                  <p className="font-bold text-sm">Mon Dashboard Coach</p>
                  <p className="text-xs text-white/75">Séances, revenus et statistiques</p>
                </div>
                <svg className="w-5 h-5 text-white/60 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
            <Link href="/coaches"
              className="block bg-white border-2 border-primary-200 rounded-3xl p-4 active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-2xl flex items-center justify-center text-xl">🏅</div>
                <div>
                  <p className="font-bold text-sm text-gray-900">Mon profil coach</p>
                  <p className="text-xs text-gray-400">Voir comme les élèves me voient</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>
        )}

        {/* Expert content access */}
        {(profile as any).role === 'expert' && !profile.is_coach && (
          <div className="px-4 mt-5">
            <Link href="/expert"
              className="block bg-gradient-to-r from-violet-500 to-purple-600 rounded-3xl p-4 text-white shadow-lg shadow-violet-500/20 active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl flex-shrink-0">📚</div>
                <div>
                  <p className="font-bold text-sm">Espace Expert</p>
                  <p className="text-xs text-white/75">Partager mon expertise avec la communauté</p>
                </div>
                <svg className="w-5 h-5 text-white/60 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
