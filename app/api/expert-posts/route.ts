import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { EXPERT_POSTS, EXPERT_COMMENTS, EXPERT_POST_LIKES, PROFILES, SPORTS, getNextId } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const sport    = searchParams.get('sport')
  const limit    = parseInt(searchParams.get('limit') ?? '20')
  const offset   = parseInt(searchParams.get('offset') ?? '0')

  const auth = await getUserFromRequest(req)

  // ── Mock mode ────────────────────────────────────────────────────────────────
  if (useMockData) {
    let data = [...EXPERT_POSTS]
    if (category) data = data.filter((p) => p.category === category)
    if (sport && sport !== 'all')
      data = data.filter((p) => String(p.sport_id) === sport || p.sport?.name.toLowerCase() === sport.toLowerCase())

    data = data
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit)
      .map((p) => ({
        ...p,
        comments_count: EXPERT_COMMENTS.filter((c) => c.expert_post_id === p.id).length,
        liked: auth ? EXPERT_POST_LIKES.some((l) => l.post_id === p.id && l.user_id === auth.userId) : false,
      }))

    return NextResponse.json({ data })
  }

  // ── Real mode: Prisma ────────────────────────────────────────────────────────
  const { prisma } = await import('@/lib/prisma')

  const where: any = {}
  if (category) where.category = category.toUpperCase()
  if (sport && sport !== 'all') where.sport = { name: { equals: sport, mode: 'insensitive' } }

  const posts = await prisma.expertPost.findMany({
    where,
    include: {
      author: true,
      sport: true,
      _count: { select: { comments: true, likedBy: true } },
      likedBy: auth ? { where: { profileId: auth.userId } } : false,
      savedBy: auth ? { where: { profileId: auth.userId } } : false,
    },
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
  })

  const data = posts.map((p) => ({
    id: p.id,
    author_id: p.authorId,
    author: serializeProfile(p.author),
    title: p.title,
    content: p.content,
    excerpt: p.excerpt,
    category: p.category.toLowerCase(),
    sport_id: p.sportId,
    sport: p.sport,
    likes: p._count.likedBy,
    liked: auth ? p.likedBy.length > 0 : false,
    saved: auth ? p.savedBy.length > 0 : false,
    comments_count: p._count.comments,
    read_time: p.readTime,
    created_at: p.createdAt.toISOString(),
  }))

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  try {
    const body = await req.json()
    const { title, content, category, sport_id } = body

    if (!title?.trim() || !content?.trim() || !category)
      return NextResponse.json({ error: 'Titre, contenu et catégorie sont requis.' }, { status: 400 })

    const wordCount = content.trim().split(/\s+/).length
    const readTime = Math.max(1, Math.round(wordCount / 200))
    const excerpt = content.trim().split('\n')[0].replace(/\*\*/g, '').slice(0, 120) + '…'

    // ── Mock mode ────────────────────────────────────────────────────────────────
    if (useMockData) {
      const author = PROFILES.find((p) => p.user_id === auth.userId)
      const sport = sport_id ? SPORTS.find((s) => s.id === sport_id) : undefined
      const newPost = {
        id: getNextId(EXPERT_POSTS), author_id: auth.userId, author, title: title.trim(),
        content: content.trim(), excerpt, category, sport_id, sport, media: [],
        likes: 0, liked: false, comments_count: 0, saved: false,
        read_time: readTime, created_at: new Date().toISOString(),
      }
      EXPERT_POSTS.unshift(newPost as any)
      return NextResponse.json({ data: newPost }, { status: 201 })
    }

    // ── Real mode: Prisma ────────────────────────────────────────────────────────
    const { prisma } = await import('@/lib/prisma')

    const post = await prisma.expertPost.create({
      data: {
        authorId: auth.userId,
        title: title.trim(),
        content: content.trim(),
        excerpt,
        category: category.toUpperCase() as any,
        sportId: sport_id ?? null,
        readTime,
      },
      include: { author: true, sport: true },
    })

    return NextResponse.json({
      data: {
        id: post.id, author_id: post.authorId, author: serializeProfile(post.author),
        title: post.title, content: post.content, excerpt: post.excerpt,
        category: post.category.toLowerCase(), sport_id: post.sportId,
        likes: 0, liked: false, comments_count: 0, saved: false,
        read_time: post.readTime, created_at: post.createdAt.toISOString(),
      }
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/expert-posts]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

function serializeProfile(p: any) {
  return {
    id: p.id, user_id: p.id, name: p.name, avatar_url: p.avatarUrl,
    city: p.city, level: p.level?.toLowerCase(), is_coach: p.isCoach,
    role: p.role?.toLowerCase(), bio: p.bio,
  }
}
