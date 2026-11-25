import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signToken } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { MOCK_USERS, PROFILES, getNextId } from '@/lib/mock-data'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password || !name)
      return NextResponse.json({ error: 'Email, mot de passe et nom sont requis.' }, { status: 400 })
    if (password.length < 6)
      return NextResponse.json({ error: 'Le mot de passe doit faire au moins 6 caractères.' }, { status: 400 })

    // ── Mock mode ──────────────────────────────────────────────────────────────
    if (useMockData) {
      const existing = MOCK_USERS.find((u) => u.email === email)
      if (existing)
        return NextResponse.json({ error: 'Cet email est déjà utilisé.' }, { status: 409 })

      const hash = await bcrypt.hash(password, 10)
      const newUser = { id: getNextId(MOCK_USERS), email, password_hash: hash, name }
      MOCK_USERS.push(newUser)
      PROFILES.push({
        id: getNextId(PROFILES),
        user_id: newUser.id,
        name,
        avatar_url: `https://api.dicebear.com/8.x/avataaars/svg?seed=${name}`,
        is_coach: false,
        email,
      })

      const token = signToken({ userId: newUser.id, email })
      return NextResponse.json({ token, user: { id: newUser.id, email, name } }, { status: 201 })
    }

    // ── Real mode: Supabase Auth (admin, skip email confirmation) ─────────────
    const { supabaseAdmin } = await import('@/lib/supabase-admin')

    // Try to create user; if already exists but unconfirmed, confirm & update password
    let authUserId: string
    const { data: adminData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { name },
    })

    if (createError) {
      // Check if user already exists in auth
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      const existing = (listData?.users ?? []).find((u: any) => u.email === email)
      if (!existing) {
        return NextResponse.json({ error: createError.message ?? 'Inscription impossible.' }, { status: 400 })
      }
      // Auto-confirm and update password so they can log in
      await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password, email_confirm: true, user_metadata: { name },
      })
      authUserId = existing.id
    } else {
      if (!adminData.user) return NextResponse.json({ error: 'Inscription impossible.' }, { status: 400 })
      authUserId = adminData.user.id
    }

    // Get or create profile (upsert in case it already exists)
    let { data: profile } = await supabaseAdmin
      .from('profiles')
      .select()
      .eq('userId', authUserId)
      .single()

    if (!profile) {
      const { data: newProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          userId: authUserId,
          email,
          name,
          avatarUrl: `https://api.dicebear.com/8.x/avataaars/svg?seed=${name}`,
          isCoach: false,
          role: 'USER',
        })
        .select()
        .single()
      if (profileError || !newProfile)
        return NextResponse.json({ error: 'Erreur création profil.' }, { status: 500 })
      profile = newProfile
    }

    // Sign in to get a valid session token
    const { createClient } = await import('@supabase/supabase-js')
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )
    const { data: signInData } = await authClient.auth.signInWithPassword({ email, password })
    const token = signInData.session?.access_token

    return NextResponse.json(
      { token, user: { id: profile.id, email, name, profile } },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/auth/register]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
