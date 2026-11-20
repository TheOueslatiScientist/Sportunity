'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthToken, getStoredUser } from '@/lib/client-utils'
import BottomNav from '@/components/BottomNav'
import { cn } from '@/lib/utils'

type Profile = { id: number; name: string; avatar_url?: string; city?: string; is_coach?: boolean }
type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted'

export default function SearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [friendStatuses, setFriendStatuses] = useState<Record<number, FriendStatus>>({})
  const [adding, setAdding] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load existing friendship statuses on mount
  useEffect(() => {
    const token = getAuthToken()
    if (!token) { router.push('/login'); return }
    fetch('/api/friends', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const statuses: Record<number, FriendStatus> = {}
        for (const f of d.data?.accepted ?? []) if (f.friend) statuses[f.friend.id] = 'accepted'
        for (const f of d.data?.pending_sent ?? []) if (f.friend) statuses[f.friend.id] = 'pending_sent'
        for (const f of d.data?.pending_received ?? []) if (f.friend) statuses[f.friend.id] = 'pending_received'
        setFriendStatuses(statuses)
      })
      .catch(() => {})
  }, [router])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const token = getAuthToken()
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
      const r = await fetch(`/api/users?q=${encodeURIComponent(query.trim())}`, { headers })
      const d = await r.json()
      setResults(d.data ?? [])
      setLoading(false)
    }, 300)
  }, [query])

  async function handleAdd(profileId: number) {
    const token = getAuthToken()
    if (!token) { router.push('/login'); return }
    setAdding(profileId)
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressee_id: profileId }),
      })
      if (res.ok) {
        setFriendStatuses((prev) => ({ ...prev, [profileId]: 'pending_sent' }))
      }
    } finally {
      setAdding(null)
    }
  }

  function StatusButton({ profile }: { profile: Profile }) {
    const status = friendStatuses[profile.id] ?? 'none'
    if (status === 'accepted') {
      return (
        <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Amis
        </span>
      )
    }
    if (status === 'pending_sent') {
      return (
        <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
          Demande envoyée
        </span>
      )
    }
    if (status === 'pending_received') {
      return (
        <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-3 py-1.5 rounded-full">
          Demande reçue
        </span>
      )
    }
    return (
      <button
        onClick={() => handleAdd(profile.id)}
        disabled={adding === profile.id}
        className="flex items-center gap-1.5 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 active:scale-95 transition-all px-3 py-1.5 rounded-full disabled:opacity-60"
      >
        {adding === profile.id ? (
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        )}
        Ajouter
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Rechercher</h1>
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un profil par nom..."
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-2xl text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary-400 transition-all"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && query.trim() && results.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3">
            <span className="text-4xl">🔍</span>
            <p className="font-bold text-gray-700">Aucun résultat pour "{query}"</p>
            <p className="text-sm text-gray-400">Essaie un autre prénom ou nom.</p>
          </div>
        )}

        {/* Placeholder */}
        {!loading && !query.trim() && (
          <div className="flex flex-col items-center py-16 gap-3">
            <span className="text-5xl">👤</span>
            <p className="font-bold text-gray-700">Cherche un sportif</p>
            <p className="text-sm text-gray-400 text-center">Tape un prénom ou nom pour trouver un profil et l'ajouter à tes amis.</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((profile) => (
              <div key={profile.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-2xl bg-gray-100 overflow-hidden flex-shrink-0">
                  <img
                    src={profile.avatar_url ?? `https://api.dicebear.com/8.x/avataaars/svg?seed=${profile.name}`}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{profile.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {profile.city && (
                      <span className="text-xs text-gray-400 truncate">{profile.city}</span>
                    )}
                    {profile.is_coach && (
                      <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-full">Coach</span>
                    )}
                  </div>
                </div>

                <StatusButton profile={profile} />
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
