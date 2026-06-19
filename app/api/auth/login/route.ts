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

    // ── Real mode: Supabase Auth + Prisma ─────────────────────────────────────
    const { createBrowserClient } = await import('@/lib/supabase')
    const { prisma } = await import('@/lib/prisma')

    const supabase = createBrowserClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.session)
      return NextResponse.json({ error: 'Email ou mot de passe incorrect.' }, { status: 401 })

    // Get or create profile in DB
    let profile = await prisma.profile.findUnique({
      where: { userId: data.user.id },
      include: { coach: true },
    })

    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          userId: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name ?? email.split('@')[0],
          isCoach: false,
          role: 'USER',
        },
        include: { coach: true },
      })
    }

    return NextResponse.json({
      token: data.session.access_token,
      user: {
        id: profile.id,
        email: data.user.email,
        name: profile.name,
        city: profile.city,
        is_coach: profile.isCoach,
        role: profile.role.toLowerCase(),
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
