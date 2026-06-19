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
      .map((p) => ({
        ...p,
        comments_count: COMMENTS.filter((c) => c.post_id === p.id).length,
      }))
    return NextResponse.json({ data })
  }

  const { getDb } = await import('@/lib/db')
  const db = getDb()
  const res = await db.query(
    `SELECT p.*,
     json_build_object('id', pr.id, 'name', pr.name, 'avatar_url', pr.avatar_url, 'is_coach', pr.is_coach) as author,
     json_build_object('id', s.id, 'name', s.name, 'icon', s.icon, 'color', s.color) as sport,
     COUNT(DISTINCT c.id) as comments_count
     FROM posts p
     JOIN profiles pr ON pr.user_id = p.author_id
     LEFT JOIN sports s ON s.id = p.sport_id
     LEFT JOIN comments c ON c.post_id = p.id
     GROUP BY p.id, pr.id, s.id
     ORDER BY p.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  )
  return NextResponse.json({ data: res.rows })
}

export async function POST(req: NextRequest) {
  const auth = getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  try {
    const body = await req.json()
    const { content, sport_id, image_url, type = 'post', media = [] } = body

    if (!content?.trim() && (!media || media.length === 0)) {
      return NextResponse.json({ error: 'Le contenu ou un média est requis.' }, { status: 400 })
    }

    if (useMockData) {
      const author = PROFILES.find((p) => p.user_id === auth.userId)
      const sport = sport_id ? SPORTS.find((s) => s.id === sport_id) : undefined

      const newPost = {
        id: getNextId(POSTS),
        author_id: auth.userId,
        author,
        content: content?.trim() ?? '',
        image_url,
        media: media.length > 0 ? media : undefined,
        sport_id,
        sport,
        type,
        likes: 0,
        liked: false,
        comments_count: 0,
        created_at: new Date().toISOString(),
      }
      POSTS.unshift(newPost)
      return NextResponse.json({ data: newPost }, { status: 201 })
    }

    const { getDb } = await import('@/lib/db')
    const db = getDb()
    const res = await db.query(
      `INSERT INTO posts (author_id, content, image_url, sport_id, type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [auth.userId, content.trim(), image_url ?? null, sport_id ?? null, type]
    )
    return NextResponse.json({ data: res.rows[0] }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/posts]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
