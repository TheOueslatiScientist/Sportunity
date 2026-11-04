import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { POSTS, PROFILES, SPORTS, COMMENTS, getNextId } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = parseInt(searchParams.get('offset') ?? '0')

  if (useMockData) {
    const data = [...POSTS]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit)
      .map((p) => ({ ...p, comments_count: COMMENTS.filter((c) => c.post_id === p.id).length }))
    return NextResponse.json({ data })
  }

  const { prisma } = await import('@/lib/prisma')
  const posts = await prisma.post.findMany({
    include: {
      author: true,
      sport: true,
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
  })

  const data = posts.map((p) => ({
    id: p.id, content: p.content, image_url: p.imageUrl, type: p.type, likes: p.likes,
    created_at: p.createdAt, sport_id: p.sportId, sport: p.sport,
    author: { id: p.author.id, name: p.author.name, avatar_url: p.author.avatarUrl, is_coach: p.author.isCoach },
    comments_count: p._count.comments,
  }))
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  try {
    const body = await req.json()
    const { content, sport_id, image_url, type = 'post', media = [] } = body

    if (!content?.trim() && (!media || media.length === 0))
      return NextResponse.json({ error: 'Le contenu ou un média est requis.' }, { status: 400 })

    if (useMockData) {
      const author = PROFILES.find((p) => p.user_id === auth.userId)
      const sport = sport_id ? SPORTS.find((s) => s.id === sport_id) : undefined
      const newPost = {
        id: getNextId(POSTS), author_id: auth.userId, author, content: content?.trim() ?? '',
        image_url, media: media.length > 0 ? media : undefined, sport_id, sport,
        type, likes: 0, liked: false, comments_count: 0, created_at: new Date().toISOString(),
      }
      POSTS.unshift(newPost)
      return NextResponse.json({ data: newPost }, { status: 201 })
    }

    const { prisma } = await import('@/lib/prisma')
    const post = await prisma.post.create({
      data: {
        authorId: auth.userId as number,
        content: content?.trim() ?? '',
        imageUrl: image_url ?? null,
        sportId: sport_id ?? null,
        type,
      },
      include: { author: true, sport: true },
    })
    return NextResponse.json({ data: post }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/posts]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
