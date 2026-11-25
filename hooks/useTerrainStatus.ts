'use client'
import { useState, useEffect, useCallback } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { TerrainStatusValue } from '@/types'
import { getAuthToken } from '@/lib/client-utils'

export interface TerrainStatusState {
  status: TerrainStatusValue
  nbJoueurs?: number
  updatedAt?: string
}

export interface UseTerrainStatusReturn extends TerrainStatusState {
  loading: boolean
  submitting: boolean
  signaler: (status: 'libre' | 'occupe', nbJoueurs?: number) => Promise<boolean>
}

export function useTerrainStatus(infrastructureId: number): UseTerrainStatusReturn {
  const [state, setState] = useState<TerrainStatusState>({ status: 'inconnu' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/infrastructures/${infrastructureId}/status`)
      if (!res.ok) return
      const json = (await res.json()) as { data?: TerrainStatusState }
      setState(json.data ?? { status: 'inconnu' })
    } catch {
      // network error — keep previous state
    } finally {
      setLoading(false)
    }
  }, [infrastructureId])

  useEffect(() => {
    setLoading(true)
    setState({ status: 'inconnu' })
    fetchStatus()

    let channel: RealtimeChannel | null = null

    // Supabase Realtime — subscribe to changes on this infrastructure's rows
    import('@/lib/supabase').then(({ createBrowserClient }) => {
      const supabase = createBrowserClient()
      channel = supabase
        .channel(`terrain_status_${infrastructureId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'terrain_statuses',
            filter: `infrastructureId=eq.${infrastructureId}`,
          },
          () => { void fetchStatus() },
        )
        .subscribe()
    })

    return () => {
      channel?.unsubscribe()
    }
  }, [infrastructureId, fetchStatus])

  const signaler = useCallback(
    async (status: 'libre' | 'occupe', nbJoueurs?: number): Promise<boolean> => {
      const token = getAuthToken()
      if (!token) return false
      setSubmitting(true)
      try {
        const res = await fetch(`/api/infrastructures/${infrastructureId}/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status, nb_joueurs: nbJoueurs ?? null }),
        })
        if (!res.ok) return false
        await fetchStatus()
        return true
      } catch {
        return false
      } finally {
        setSubmitting(false)
      }
    },
    [infrastructureId, fetchStatus],
  )

  return { ...state, loading, submitting, signaler }
}
