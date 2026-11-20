'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthToken } from '@/lib/client-utils'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Profile = { id: number; name: string; avatar_url?: string; city?: string; is_coach?: boolean; bio?: string }
type FriendRequest = { id: number; friend: Profile }
type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted'

function Avatar({ name, url }: { name: string; url?: string }) {
  const colors = ['bg-emerald-100 text-emerald-700', 'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700']
  const color = colors[name.charCodeAt(0) % colors.length]
  if (url) return <img src={url} alt={name} className="w-full h-full object-cover" />
  return <div className={cn('w-full h-full flex items-center justify-center font-bold text-base', color)}>{name[0]?.toUpperCase()}</div>
}

export default function NetworkPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [suggestions, setSuggestions] = useState<Profile[]>([])
  const [friendStatuses, setFriendStatuses] = useState<Record<number, FriendStatus>>({})
  const [acting, setActing] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const token = getAuthToken()
    if (!token) { router.push('/login'); return }

    Promise.all([
      fetch('/api/friends', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([friendData, usersData]) => {
      const accepted: FriendRequest[] = friendData.data?.accepted ?? []
      const sent: FriendRequest[] = friendData.data?.pending_sent ?? []
      const received: FriendRequest[] = friendData.data?.pending_received ?? []

      setPendingRequests(received)

      const statuses: Record<number, FriendStatus> = {}
      for (const f of accepted) if (f.friend) statuses[f.friend.id] = 'accepted'
      for (const f of sent) if (f.friend) statuses[f.friend.id] = 'pending_sent'
      for (const f of received) if (f.friend) statuses[f.friend.id] = 'pending_received'
      setFriendStatuses(statuses)

      const knownIds = new Set([
        ...accepted.map((f: any) => f.friend?.id),
        ...sent.map((f: any) => f.friend?.id),
        ...received.map((f: any) => f.friend?.id),
      ].filter(Boolean))

      const allUsers: Profile[] = usersData.data ?? []
      setSuggestions(allUsers.filter(u => !knownIds.has(u.id)).slice(0, 10))
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [router])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setSearchResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      const token = getAuthToken()
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
      const r = await fetch(`/api/users?q=${encodeURIComponent(query.trim())}`, { headers })
      const d = await r.json()
      setSearchResults(d.data ?? [])
      setSearchLoading(false)
    }, 300)
  }, [query])

  async function handleAdd(profileId: number) {
    const token = getAuthToken()
    if (!token) return
    setActing(profileId)
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ addressee_id: profileId }),
    })
    if (res.ok) setFriendStatuses(prev => ({ ...prev, [profileId]: 'pending_sent' }))
    setActing(null)
  }

  async function handleRequest(friendshipId: number, action: 'accept' | 'reject', peerId: number) {
    const token = getAuthToken()
    if (!token) return
    setActing(friendshipId)
    const res = await fetch(`/api/friends/${friendshipId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      setPendingRequests(prev => prev.filter(r => r.id !== friendshipId))
      if (action === 'accept') {
        setFriendStatuses(prev => ({ ...prev, [peerId]: 'accepted' }))
        setSuggestions(prev => prev.filter(u => u.id !== peerId))
      }
    }
    setActing(null)
  }

  function AddButton({ profile }: { profile: Profile }) {
    const status = friendStatuses[profile.id] ?? 'none'
    if (status === 'accepted') return (
      <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full">✓ Ami</span>
    )
    if (status === 'pending_sent') return (
      <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">Envoyée</span>
    )
    if (status === 'pending_received') return (
      <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-3 py-1.5 rounded-full">Reçue</span>
    )
    return (
      <button
        onClick={() => handleAdd(profile.id)}
        disabled={acting === profile.id}
        className="flex items-center gap-1 text-xs font-bold text-primary-700 border border-primary-300 hover:bg-primary-50 active:scale-95 transition-all px-3 py-1.5 rounded-full disabled:opacity-60"
      >
        {acting === profile.id
          ? <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          : <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> Ajouter</>
        }
      </button>
    )
  }

  function ProfileCard({ profile, showMessage = true }: { profile: Profile; showMessage?: boolean }) {
    return (
      <Link href={`/users/${profile.id}`} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 active:scale-[0.98] transition-transform">
        <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100">
          <Avatar name={profile.name} url={profile.avatar_url} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">{profile.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {profile.city && <span className="text-xs text-gray-400 truncate">{profile.city}</span>}
            {profile.is_coach && <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-full">Coach</span>}
          </div>
        </div>
        <div onClick={e => e.preventDefault()}>
          <AddButton profile={profile} />
        </div>
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-10">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Mon réseau</h1>
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher un sportif..."
            className="w-full pl-10 pr-9 py-2.5 bg-gray-100 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary-400 transition-all"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-5">

        {/* Search results */}
        {query.trim() && (
          <div>
            {searchLoading && (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!searchLoading && searchResults.length === 0 && (
              <div className="flex flex-col items-center py-12 gap-2">
                <span className="text-4xl">🔍</span>
                <p className="font-bold text-gray-700">Aucun résultat pour "{query}"</p>
              </div>
            )}
            {!searchLoading && searchResults.length > 0 && (
              <div className="flex flex-col gap-2">
                {searchResults.map(p => <ProfileCard key={p.id} profile={p} />)}
              </div>
            )}
          </div>
        )}

        {/* Network sections — hidden when searching */}
        {!query.trim() && (
          <>
            {/* Pending invitations */}
            {!loaded && (
              <div className="flex justify-center py-10">
                <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {loaded && pendingRequests.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-gray-900">Invitations reçues</h2>
                  <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="bg-white rounded-2xl border border-primary-100 p-4 flex items-center gap-3">
                      <Link href={`/users/${req.friend.id}`} className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100">
                        <Avatar name={req.friend.name} url={req.friend.avatar_url} />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/users/${req.friend.id}`}>
                          <p className="font-bold text-gray-900 text-sm truncate">{req.friend.name}</p>
                          {req.friend.city && <p className="text-xs text-gray-400 mt-0.5">{req.friend.city}</p>}
                        </Link>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleRequest(req.id, 'reject', req.friend.id)}
                          disabled={acting === req.id}
                          className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <button
                          onClick={() => handleRequest(req.id, 'accept', req.friend.id)}
                          disabled={acting === req.id}
                          className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {acting === req.id
                            ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          }
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Suggestions */}
            {loaded && suggestions.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-900 mb-2">Personnes que vous connaissez peut-être</h2>
                <div className="flex flex-col gap-2">
                  {suggestions.map(p => <ProfileCard key={p.id} profile={p} />)}
                </div>
              </section>
            )}

            {loaded && pendingRequests.length === 0 && suggestions.length === 0 && (
              <div className="flex flex-col items-center py-20 gap-3">
                <span className="text-5xl">🤝</span>
                <p className="font-bold text-gray-700">Votre réseau est vide</p>
                <p className="text-sm text-gray-400 text-center">Utilisez la barre de recherche pour trouver des sportifs.</p>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
