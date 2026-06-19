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

    // ── Real mode: Supabase Auth + Prisma ─────────────────────────────────────
    const { createBrowserClient } = await import('@/lib/supabase')
    const { prisma } = await import('@/lib/prisma')

    const supabase = createBrowserClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data.user)
      return NextResponse.json({ error: 'Inscription impossible.' }, { status: 400 })

    // Create profile in DB
    const profile = await prisma.profile.create({
      data: {
        userId: data.user.id,
        email,
        name,
        avatarUrl: `https://api.dicebear.com/8.x/avataaars/svg?seed=${name}`,
        isCoach: false,
        role: 'USER',
      },
    })

    const token = data.session?.access_token
    return NextResponse.json(
      { token, user: { id: profile.id, email, name, profile } },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/auth/register]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
