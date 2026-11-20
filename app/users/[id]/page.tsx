'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getAuthToken } from '@/lib/client-utils'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

type Post = { id: number; title?: string; content: string; image_url?: string; likes_count: number; created_at: string }
type Profile = {
  id: number; name: string; avatar_url?: string; bio?: string
  city?: string; level?: string; is_coach?: boolean; email?: string
  stats?: { matches: number; friends: number; posts: number }
  recent_matches?: { id: number; title: string; date: string; status: string; sportId?: number }[]
  posts?: Post[]
}
type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted'

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé',
}

const BANNER_GRADIENTS = [
  'from-primary-600 to-primary-400',
  'from-blue-600 to-cyan-400',
  'from-purple-600 to-pink-400',
  'from-orange-500 to-yellow-400',
  'from-green-600 to-teal-400',
]

function bannerGradient(name: string) {
  const idx = name.charCodeAt(0) % BANNER_GRADIENTS.length
  return BANNER_GRADIENTS[idx]
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('none')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const token = getAuthToken()
    if (!token) { router.push('/login'); return }

    Promise.all([
      fetch(`/api/users/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/friends', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([userData, friendData]) => {
      setProfile(userData.data ?? null)
      setLoading(false)
      const pid = parseInt(id)
      const accepted = friendData.data?.accepted ?? []
      const sent = friendData.data?.pending_sent ?? []
      const received = friendData.data?.pending_received ?? []
      if (accepted.some((f: any) => f.friend?.id === pid)) setFriendStatus('accepted')
      else if (sent.some((f: any) => f.friend?.id === pid)) setFriendStatus('pending_sent')
      else if (received.some((f: any) => f.friend?.id === pid)) setFriendStatus('pending_received')
    }).catch(() => setLoading(false))
  }, [id, router])

  async function handleAdd() {
    const token = getAuthToken()
    if (!token) return
    setAdding(true)
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ addressee_id: parseInt(id) }),
    })
    if (res.ok) setFriendStatus('pending_sent')
    setAdding(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!profile) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 pb-24">
      <span className="text-5xl">🔍</span>
      <p className="font-bold text-gray-700">Utilisateur introuvable</p>
      <button onClick={() => router.back()} className="text-primary-600 text-sm font-semibold">← Retour</button>
      <BottomNav />
    </div>
  )

  const avatarUrl = profile.avatar_url ?? `https://api.dicebear.com/8.x/avataaars/svg?seed=${profile.name}`
  const gradient = bannerGradient(profile.name)

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* Banner */}
      <div className={`relative h-36 bg-gradient-to-r ${gradient}`}>
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-8 h-8 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Avatar + name section */}
      <div className="bg-white border-b border-gray-100 px-4 pb-5">
        <div className="flex items-end justify-between -mt-10 mb-3">
          <div className="w-20 h-20 rounded-3xl overflow-hidden border-4 border-white shadow-lg bg-white">
            <img src={avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
          </div>
          {/* Action buttons */}
          <div className="flex gap-2 mb-1">
            <Link
              href={`/chat?user=${profile.id}`}
              className="flex items-center gap-1.5 text-sm font-semibold text-primary-700 border border-primary-200 bg-primary-50 hover:bg-primary-100 px-3 py-2 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 3H3a2 2 0 00-2 2v13a2 2 0 002 2h7l3 3 3-3h5a2 2 0 002-2V5a2 2 0 00-2-2z" />
              </svg>
              Message
            </Link>
            {friendStatus === 'none' && (
              <button
                onClick={handleAdd}
                disabled={adding}
                className="flex items-center gap-1.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 active:scale-95 transition-all px-3 py-2 rounded-xl disabled:opacity-60"
              >
                {adding
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                }
                Ajouter
              </button>
            )}
            {friendStatus === 'accepted' && (
              <div className="flex items-center gap-1.5 text-sm font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-2 rounded-xl">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Amis
              </div>
            )}
            {friendStatus === 'pending_sent' && (
              <div className="text-sm font-semibold text-gray-400 bg-gray-100 border border-gray-200 px-3 py-2 rounded-xl">
                Demande envoyée
              </div>
            )}
            {friendStatus === 'pending_received' && (
              <div className="text-sm font-semibold text-orange-500 bg-orange-50 border border-orange-200 px-3 py-2 rounded-xl">
                Demande reçue
              </div>
            )}
          </div>
        </div>

        {/* Name + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-extrabold text-gray-900">{profile.name}</h1>
          {profile.is_coach && (
            <span className="text-xs font-bold text-primary-600 bg-primary-50 border border-primary-200 px-2 py-0.5 rounded-full">🏅 Coach</span>
          )}
          {profile.level && (
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {LEVEL_LABELS[profile.level] ?? profile.level}
            </span>
          )}
        </div>

        {profile.city && (
          <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {profile.city}
          </div>
        )}

        {profile.bio && (
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">{profile.bio}</p>
        )}

        {/* Stats row */}
        <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-xl font-extrabold text-gray-900">{profile.stats?.matches ?? 0}</p>
            <p className="text-xs text-gray-400 font-medium">Matchs</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div className="text-center">
            <p className="text-xl font-extrabold text-gray-900">{profile.stats?.friends ?? 0}</p>
            <p className="text-xs text-gray-400 font-medium">Amis</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div className="text-center">
            <p className="text-xl font-extrabold text-gray-900">{profile.stats?.posts ?? 0}</p>
            <p className="text-xs text-gray-400 font-medium">Posts</p>
          </div>
        </div>
      </div>

      {/* Recent matches */}
      {(profile.recent_matches?.length ?? 0) > 0 && (
        <div className="mx-4 mt-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">Derniers matchs</h2>
          <div className="flex flex-col gap-2">
            {profile.recent_matches!.map((m) => (
              <Link key={m.id} href={`/matches/${m.id}`}
                className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between gap-3 active:scale-[0.98] transition-transform">
                <div>
                  <p className="text-sm font-bold text-gray-900 truncate">{m.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                  m.status === 'COMPLETED' ? 'bg-gray-100 text-gray-500' :
                  m.status === 'FULL' ? 'bg-orange-50 text-orange-600' :
                  'bg-green-50 text-green-600'
                }`}>
                  {m.status === 'COMPLETED' ? 'Terminé' : m.status === 'FULL' ? 'Complet' : 'Ouvert'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Posts */}
      <div className="mx-4 mt-4">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">Publications</h2>
        {(profile.posts?.length ?? 0) === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <span className="text-3xl">📝</span>
            <p className="text-sm font-semibold text-gray-500 mt-2">Aucune publication</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {profile.posts!.map((post) => (
              <div key={post.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {post.image_url && (
                  <img src={post.image_url} alt="" className="w-full h-48 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      <img src={avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{profile.name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(post.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  {post.title && <p className="font-bold text-gray-900 mb-1">{post.title}</p>}
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="text-xs font-semibold text-gray-400">{post.likes_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
