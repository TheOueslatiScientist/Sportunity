import { useMockData } from '@/lib/db'

// ─── Mock mode (kept for local dev without Supabase) ─────────────────────────
import jwt from 'jsonwebtoken'
import type { JwtPayload } from '@/types'

const JWT_SECRET = process.env.JWT_SECRET || 'sportunity-fallback-secret'
const JWT_EXPIRES_IN = '7d'

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}

// ─── Unified getUserFromRequest ───────────────────────────────────────────────
// Returns { userId: number, email: string } in both mock and real mode.
// In real mode, userId is the integer Profile.id (not the Supabase UUID).

export async function getUserFromRequest(
  request: Request
): Promise<JwtPayload | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '')

  // Mock mode: verify our own JWT
  if (useMockData) {
    return verifyToken(token)
  }

  // Real mode: verify via Supabase, resolve integer Profile ID
  const { verifySupabaseToken } = await import('@/lib/supabase')
  const { prisma } = await import('@/lib/prisma')

  const supabaseUser = await verifySupabaseToken(token)
  if (!supabaseUser) return null

  const profile = await prisma.profile.findUnique({
    where: { userId: supabaseUser.id },
  })
  if (!profile) return null

  return { userId: profile.id, email: supabaseUser.email! }
}
