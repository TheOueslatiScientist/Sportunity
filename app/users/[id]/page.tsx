'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getAuthToken } from '@/lib/client-utils'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

type Profile = { id: number; name: string; avatar_url?: string; bio?: string; city?: string; level?: string; is_coach?: boolean; email?: string }
type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted'

const LEVEL_LABELS: Record<string, string> = { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé' }

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

    // Fetch profile
    fetch(`/api/users/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setProfile(d.data ?? null); setLoading(false) })
      .catch(() => setLoading(false))

    // Fetch friend status
    fetch('/api/friends', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const pid = parseInt(id)
        const accepted = d.data?.accepted ?? []
        const sent = d.data?.pending_sent ?? []
        const received = d.data?.pending_received ?? []
        if (accepted.some((f: any) => f.friend?.id === pid)) setFriendStatus('accepted')
        else if (sent.some((f: any) => f.friend?.id === pid)) setFriendStatus('pending_sent')
        else if (received.some((f: any) => f.friend?.id === pid)) setFriendStatus('pending_received')
        else setFriendStatus('none')
      })
      .catch(() => {})
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
      <Link href="/profile" className="text-primary-600 text-sm font-semibold">← Retour</Link>
      <BottomNav />
    </div>
  )

  const avatarUrl = profile.avatar_url ?? `https://api.dicebear.com/8.x/avataaars/svg?seed=${profile.name}`

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-10 pb-6">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 font-medium mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>

        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-3xl overflow-hidden bg-gray-100 flex-shrink-0">
            <img src={avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-gray-900">{profile.name}</h1>
              {profile.is_coach && (
                <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">Coach</span>
              )}
            </div>
            {profile.city && <p className="text-sm text-gray-500 mt-0.5">{profile.city}</p>}
            {profile.level && (
              <span className="inline-block mt-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {LEVEL_LABELS[profile.level] ?? profile.level}
              </span>
            )}
          </div>
        </div>

        {/* Action button */}
        <div className="mt-4">
          {friendStatus === 'accepted' && (
            <div className="flex items-center gap-2 text-sm font-semibold text-green-600 bg-green-50 px-4 py-2.5 rounded-2xl w-full justify-center">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Amis
            </div>
          )}
          {friendStatus === 'pending_sent' && (
            <div className="text-sm font-semibold text-gray-400 bg-gray-100 px-4 py-2.5 rounded-2xl w-full text-center">
              Demande envoyée
            </div>
          )}
          {friendStatus === 'pending_received' && (
            <div className="text-sm font-semibold text-orange-500 bg-orange-50 px-4 py-2.5 rounded-2xl w-full text-center">
              Demande reçue
            </div>
          )}
          {friendStatus === 'none' && (
            <button
              onClick={handleAdd}
              disabled={adding}
              className="w-full flex items-center justify-center gap-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 active:scale-95 transition-all px-4 py-2.5 rounded-2xl disabled:opacity-60"
            >
              {adding ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              )}
              Ajouter
            </button>
          )}
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm text-gray-600 leading-relaxed">{profile.bio}</p>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
