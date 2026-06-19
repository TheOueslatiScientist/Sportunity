'use client'
import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, fullWidth, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed select-none',
          // Variants
          variant === 'primary' && 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/25',
          variant === 'secondary' && 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50',
          variant === 'ghost' && 'bg-transparent text-gray-600 hover:bg-gray-100',
          variant === 'danger' && 'bg-red-500 text-white hover:bg-red-600',
          // Sizes
          size === 'sm' && 'text-sm px-3 py-2',
          size === 'md' && 'text-sm px-5 py-3',
          size === 'lg' && 'text-base px-6 py-4',
          // Full width
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
export default Button
