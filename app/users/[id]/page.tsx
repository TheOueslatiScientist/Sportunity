'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Profile, Friendship } from '@/types'
import BottomNav from '@/components/BottomNav'
import Button from '@/components/ui/Button'
import { levelLabel } from '@/lib/utils'
import { getStoredUser, getAuthToken } from '@/lib/client-utils'
import Link from 'next/link'

export default function UserProfilePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const userId = parseInt(id)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [friendship, setFriendship] = useState<Friendship | null>(null)
  const [friendLoading, setFriendLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  useEffect(() => {
    const u = getStoredUser()
    if (u) {
      setCurrentUserId(u.id)
      if (u.id === userId) { router.replace('/profile'); return }
    }
    loadProfile()
    loadFriendship()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function loadProfile() {
    try {
      import('@/lib/mock-data').then(({ PROFILES }) => {
        const p = PROFILES.find((pr) => pr.user_id === userId)
        setProfile(p ?? null)
        setLoading(false)
      })
    } catch {
      setLoading(false)
    }
  }

  async function loadFriendship() {
    const token = getAuthToken()
    if (!token) return
    const res = await fetch('/api/friends', { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) {
      const data = await res.json()
      const all = [
        ...(data.data.accepted ?? []),
        ...(data.data.pending_received ?? []),
        ...(data.data.pending_sent ?? []),
      ] as (Friendship & { friend?: Profile })[]
      const found = all.find((f) =>
        (f.requester_id === userId || f.addressee_id === userId)
      )
      setFriendship(found ?? null)
    }
  }

  async function handleFriendAction() {
    const token = getAuthToken()
    if (!token) { router.push('/login'); return }
    setFriendLoading(true)
    try {
      if (!friendship) {
        // Send request
        const res = await fetch('/api/friends', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ addressee_id: userId }),
        })
        if (res.ok) {
          const data = await res.json()
          setFriendship(data.data)
        }
      } else if (friendship.status === 'pending' && friendship.addressee_id === currentUserId) {
        // Accept
        const res = await fetch(`/api/friends/${friendship.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'accept' }),
        })
        if (res.ok) await loadFriendship()
      } else {
        // Remove / cancel
        const res = await fetch(`/api/friends/${friendship.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) setFriendship(null)
      }
    } finally {
      setFriendLoading(false)
    }
  }

  function friendButtonLabel(): string {
    if (!friendship) return '➕ Ajouter en ami'
    if (friendship.status === 'accepted') return '✅ Ami'
    if (friendship.status === 'pending' && friendship.requester_id === currentUserId) return '⏳ En attente…'
    if (friendship.status === 'pending' && friendship.addressee_id === currentUserId) return '✅ Accepter la demande'
    return '➕ Ajouter en ami'
  }

  function friendButtonVariant(): 'primary' | 'secondary' {
    if (friendship?.status === 'accepted') return 'secondary'
    return 'primary'
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-5xl">👤</p>
        <p className="font-bold text-gray-900">Utilisateur introuvable</p>
        <Button onClick={() => router.back()}>Retour</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-extrabold text-gray-900">{profile.name}</h1>
      </div>

      <div className="px-4 py-6 pb-28 max-w-lg mx-auto">
        {/* Avatar & info */}
        <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-6 flex flex-col items-center gap-3 mb-4">
          <div className="w-24 h-24 rounded-3xl overflow-hidden bg-gray-100">
            <img
              src={profile.avatar_url ?? `https://api.dicebear.com/8.x/avataaars/svg?seed=${profile.name}`}
              alt={profile.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-extrabold text-gray-900">{profile.name}</h2>
            {profile.city && <p className="text-sm text-gray-400 mt-0.5">📍 {profile.city}</p>}
            {profile.level && (
              <span className="inline-block mt-2 px-3 py-1 bg-primary-50 text-primary-600 text-xs font-semibold rounded-xl">
                {levelLabel(profile.level)}
              </span>
            )}
          </div>
          {profile.bio && (
            <p className="text-sm text-gray-600 text-center leading-relaxed">{profile.bio}</p>
          )}

          {/* Sports */}
          {profile.sports && profile.sports.length > 0 && (
            <div className="flex gap-2 flex-wrap justify-center">
              {profile.sports.map((s) => (
                <span
                  key={s.id}
                  className="px-3 py-1 rounded-xl text-xs font-semibold"
                  style={{ backgroundColor: s.color + '20', color: s.color }}
                >
                  {s.icon} {s.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            fullWidth
            variant={friendButtonVariant()}
            loading={friendLoading}
            onClick={handleFriendAction}
          >
            {friendButtonLabel()}
          </Button>

          <Link href={`/chat?userId=${userId}`}>
            <Button fullWidth variant="secondary">
              💬 Envoyer un message
            </Button>
          </Link>

          {friendship?.status === 'accepted' && (
            <button
              onClick={handleFriendAction}
              className="text-xs text-red-400 text-center py-2 hover:text-red-500 transition-colors"
            >
              Retirer de mes amis
            </button>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
