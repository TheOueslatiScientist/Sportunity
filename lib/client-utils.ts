/**
 * Safe localStorage helpers — never throw even if storage is corrupted
 */
export function getStoredUser(): { id: number; email: string; name: string; city?: string; is_coach?: boolean; role?: 'user' | 'coach' | 'expert' } | null {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Safe cookie token reader — works in browser only
 */
export function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null
  return document.cookie.match(/token=([^;]+)/)?.[1] ?? null
}
