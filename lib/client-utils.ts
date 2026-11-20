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
 * Safe token reader — cookie first, localStorage fallback
 */
export function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null
  const fromCookie = document.cookie.match(/(?:^|;\s*)token=([^;]+)/)?.[1]
  if (fromCookie) return decodeURIComponent(fromCookie)
  try { return localStorage.getItem('auth_token') } catch { return null }
}

export function setAuthToken(token: string): void {
  try {
    document.cookie = `token=${encodeURIComponent(token)};path=/;max-age=604800;SameSite=Lax`
    localStorage.setItem('auth_token', token)
  } catch { /* ignore */ }
}
