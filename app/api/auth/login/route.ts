import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signToken } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { MOCK_USERS, PROFILES } from '@/lib/mock-data'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password)
      return NextResponse.json({ error: 'Email et mot de passe requis.' }, { status: 400 })

    // ── Mock mode ──────────────────────────────────────────────────────────────
    if (useMockData) {
      let user = MOCK_USERS.find((u) => u.email === email)
      if (!user) {
        const hash = await bcrypt.hash(password, 10)
        const name = email.split('@')[0]
        user = { id: MOCK_USERS.length + 1, email, password_hash: hash, name }
        MOCK_USERS.push(user)
        PROFILES.push({
          id: PROFILES.length + 1,
          user_id: user.id,
          name,
          avatar_url: `https://api.dicebear.com/8.x/avataaars/svg?seed=${name}`,
          is_coach: false,
          email,
        })
      }
      const token = signToken({ userId: user.id, email: user.email })
      const profile = PROFILES.find((p) => p.user_id === user!.id)
      return NextResponse.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          city: profile?.city,
          is_coach: profile?.is_coach ?? false,
          role: profile?.role ?? 'user',
          profile,
        },
      })
    }

    // ── Real mode: Supabase Auth ───────────────────────────────────────────────
    const { createClient } = await import('@supabase/supabase-js')
    const { supabaseAdmin } = await import('@/lib/supabase-admin')

    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )

    let { data, error } = await authClient.auth.signInWithPassword({ email, password })

    // If email not confirmed, auto-confirm via admin and retry
    if (error?.message?.toLowerCase().includes('email') && error.message.toLowerCase().includes('confirm')) {
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      const existing = (listData?.users ?? []).find((u: any) => u.email === email)
      if (existing) {
        await supabaseAdmin.auth.admin.updateUserById(existing.id, { email_confirm: true })
        const retry = await authClient.auth.signInWithPassword({ email, password })
        data = retry.data
        error = retry.error
      }
    }

    if (error || !data.session)
      return NextResponse.json({ error: 'Email ou mot de passe incorrect.' }, { status: 401 })

    // Get or create profile in DB
    let { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('userId', data.user.id)
      .single()

    if (!profile) {
      const name = data.user.user_metadata?.name ?? email.split('@')[0]
      const { data: newProfile } = await supabaseAdmin
        .from('profiles')
        .insert({
          userId: data.user.id,
          email: data.user.email,
          name,
          avatarUrl: `https://api.dicebear.com/8.x/avataaars/svg?seed=${name}`,
          isCoach: false,
          role: 'USER',
        })
        .select()
        .single()
      profile = newProfile
    }

    if (!profile) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 500 })

    // Use our own 7-day JWT so the token never expires mid-session (Supabase tokens expire in 1h)
    const ourToken = signToken({ userId: profile.id, email: data.user.email! })

    return NextResponse.json({
      token: ourToken,
      user: {
        id: profile.id,
        email: data.user.email,
        name: profile.name,
        city: profile.city,
        is_coach: profile.isCoach,
        role: (profile.role ?? 'USER').toLowerCase(),
        profile: serializeProfile(profile),
      },
    })
  } catch (err) {
    console.error('[POST /api/auth/login]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

function serializeProfile(p: any) {
  return {
    id: p.id,
    user_id: p.id,
    name: p.name,
    avatar_url: p.avatarUrl,
    bio: p.bio,
    level: p.level?.toLowerCase(),
    city: p.city,
    is_coach: p.isCoach,
    role: p.role?.toLowerCase(),
    email: p.email,
  }
}
