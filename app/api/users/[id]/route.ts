import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { PROFILES } from '@/lib/mock-data'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id: idStr } = await params
  const id = parseInt(idStr)

  if (useMockData) {
    const profile = PROFILES.find((p) => p.user_id === id)
    if (!profile) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })
    return NextResponse.json({ data: profile })
  }

  const { prisma } = await import('@/lib/prisma')
  const profile = await prisma.profile.findUnique({
    where: { id },
    include: { sports: { include: { sport: true } } },
  })
  if (!profile) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })

  return NextResponse.json({
    data: {
      id: profile.id, user_id: profile.id, name: profile.name, avatar_url: profile.avatarUrl,
      bio: profile.bio, city: profile.city, level: profile.level?.toLowerCase(),
      is_coach: profile.isCoach, email: profile.email,
      sports: profile.sports.map((ps) => ps.sport),
    },
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id: idStr } = await params
  const id = parseInt(idStr)
  if ((auth.userId as number) !== id) return NextResponse.json({ error: 'Interdit.' }, { status: 403 })

  const body = await req.json()

  if (useMockData) {
    const idx = PROFILES.findIndex((p) => p.user_id === id)
    if (idx === -1) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
    PROFILES[idx] = { ...PROFILES[idx], ...body }
    return NextResponse.json({ data: PROFILES[idx] })
  }

  const { prisma } = await import('@/lib/prisma')
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.bio !== undefined) data.bio = body.bio
  if (body.city !== undefined) data.city = body.city
  if (body.avatar_url !== undefined) data.avatarUrl = body.avatar_url
  if (body.level !== undefined) data.level = body.level?.toUpperCase()
  if (body.is_coach !== undefined) data.isCoach = body.is_coach

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: 'Aucun champ à mettre à jour.' }, { status: 400 })

  const updated = await prisma.profile.update({ where: { id }, data })
  return NextResponse.json({ data: updated })
}
