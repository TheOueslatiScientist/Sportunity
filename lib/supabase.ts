import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ── Browser client (used in client components / login / register) ─────────────
export function createBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}

// ── Admin client (used in API routes — bypasses RLS, verifies tokens) ─────────
export function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ── Verify a Bearer token from an Authorization header ────────────────────────
export async function verifySupabaseToken(token: string) {
  const admin = createAdminClient()
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) return null
  return user
}
