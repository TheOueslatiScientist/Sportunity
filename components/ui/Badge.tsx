import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  size?: 'sm' | 'md'
  className?: string
}

export default function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        size === 'sm' && 'text-xs px-2.5 py-0.5',
        size === 'md' && 'text-sm px-3 py-1',
        variant === 'default' && 'bg-gray-100 text-gray-700',
        variant === 'success' && 'bg-green-100 text-green-700',
        variant === 'warning' && 'bg-yellow-100 text-yellow-700',
        variant === 'danger' && 'bg-red-100 text-red-700',
        variant === 'info' && 'bg-blue-100 text-blue-700',
        variant === 'purple' && 'bg-purple-100 text-purple-700',
        className
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'success' | 'danger' | 'warning'> = {
    available: 'success',
    occupied: 'danger',
    maintenance: 'warning',
  }
  const labels: Record<string, string> = {
    available: 'Disponible',
    occupied: 'Occupé',
    maintenance: 'Travaux',
  }
  const dots: Record<string, string> = {
    available: 'bg-green-500',
    occupied: 'bg-red-500',
    maintenance: 'bg-yellow-500',
  }
  return (
    <Badge variant={variants[status] ?? 'default'}>
      <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse-dot', dots[status] ?? 'bg-gray-400')} />
      {labels[status] ?? status}
    </Badge>
  )
}
