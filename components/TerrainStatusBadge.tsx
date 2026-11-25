'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useTerrainStatus } from '@/hooks/useTerrainStatus'
import type { TerrainStatusValue } from '@/types'

const STATUS_CONFIG: Record<
  TerrainStatusValue,
  { label: string; dot: string; ring: string; text: string; bg: string }
> = {
  libre:   { label: 'Libre',   dot: 'bg-green-500',  ring: 'ring-green-200',  text: 'text-green-700',  bg: 'bg-green-50' },
  occupe:  { label: 'Occupé',  dot: 'bg-red-500',    ring: 'ring-red-200',    text: 'text-red-700',    bg: 'bg-red-50' },
  inconnu: { label: 'Inconnu', dot: 'bg-gray-400',   ring: 'ring-gray-200',   text: 'text-gray-500',   bg: 'bg-gray-50' },
}

function formatRelative(iso?: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'à l\'instant'
  if (mins < 60) return `il y a ${mins} min`
  return `il y a ${Math.floor(mins / 60)}h`
}

interface TerrainStatusBadgeProps {
  infrastructureId: number
}

export default function TerrainStatusBadge({ infrastructureId }: TerrainStatusBadgeProps) {
  const { status, nbJoueurs, updatedAt, loading, submitting, signaler } = useTerrainStatus(infrastructureId)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<'libre' | 'occupe'>('libre')
  const [joueurs, setJoueurs] = useState('')

  const cfg = STATUS_CONFIG[status]

  async function handleSubmit() {
    const nb = joueurs.trim() ? parseInt(joueurs) : undefined
    const ok = await signaler(selected, nb)
    if (ok) {
      setOpen(false)
      setJoueurs('')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* ── Status row ── */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Fréquentation signalée
        </span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors"
        >
          {open ? 'Annuler' : 'Signaler'}
        </button>
      </div>

      {/* ── Badge ── */}
      {loading ? (
        <div className="h-9 bg-gray-100 rounded-xl animate-pulse" />
      ) : (
        <div className={cn('flex items-center gap-2.5 px-3 py-2 rounded-xl ring-1', cfg.bg, cfg.ring)}>
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
          <span className={cn('text-sm font-bold', cfg.text)}>{cfg.label}</span>
          {status !== 'inconnu' && nbJoueurs != null && (
            <span className={cn('text-xs', cfg.text)}>· {nbJoueurs} joueur{nbJoueurs > 1 ? 's' : ''}</span>
          )}
          {updatedAt && (
            <span className="text-xs text-gray-400 ml-auto">{formatRelative(updatedAt)}</span>
          )}
        </div>
      )}

      {/* ── Inline form ── */}
      {open && (
        <div className="bg-gray-50 rounded-2xl p-3 flex flex-col gap-3 border border-gray-100">
          {/* Libre / Occupé toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelected('libre')}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-bold transition-all border',
                selected === 'libre'
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-300',
              )}
            >
              ✅ Libre
            </button>
            <button
              onClick={() => setSelected('occupe')}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-bold transition-all border',
                selected === 'occupe'
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-red-300',
              )}
            >
              🔴 Occupé
            </button>
          </div>

          {/* Nb joueurs (optional) */}
          <div>
            <label className="text-[11px] font-semibold text-gray-400 mb-1 block">
              Nombre de joueurs présents (optionnel)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={joueurs}
              onChange={(e) => setJoueurs(e.target.value)}
              placeholder="ex. 8"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            />
          </div>

          <button
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-primary-600 text-white text-xs font-bold disabled:opacity-50 transition-colors hover:bg-primary-700 active:scale-[0.98]"
          >
            {submitting ? 'Envoi…' : 'Envoyer le signalement'}
          </button>
          <p className="text-[10px] text-gray-400 text-center">
            Visible par tous · expire dans 2h
          </p>
        </div>
      )}
    </div>
  )
}
