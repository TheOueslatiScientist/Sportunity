import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { COMMENTS, PROFILES, getNextId } from '@/lib/mock-data'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postId = parseInt(id)

  if (useMockData) {
    const data = COMMENTS
      .filter((c) => c.post_id === postId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    return NextResponse.json({ data })
  }

  const { getDb } = await import('@/lib/db')
  const db = getDb()
  const res = await db.query(
    `SELECT c.*,
     json_build_object('id', p.id, 'name', p.name, 'avatar_url', p.avatar_url, 'is_coach', p.is_coach) as author
     FROM comments c
     JOIN profiles p ON p.user_id = c.author_id
     WHERE c.post_id = $1
     ORDER BY c.created_at ASC`,
    [postId]
  )
  return NextResponse.json({ data: res.rows })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const postId = parseInt(id)

  const body = await req.json()
  const { content } = body
  if (!content?.trim()) {
    return NextResponse.json({ error: 'Le commentaire ne peut pas être vide.' }, { status: 400 })
  }

  if (useMockData) {
    const author = PROFILES.find((p) => p.user_id === auth.userId)
    const comment = {
      id: getNextId(COMMENTS),
      post_id: postId,
      author_id: auth.userId,
      author,
      content: content.trim(),
      created_at: new Date().toISOString(),
    }
    COMMENTS.push(comment)
    return NextResponse.json({ data: comment }, { status: 201 })
  }

  const { getDb } = await import('@/lib/db')
  const db = getDb()
  const res = await db.query(
    'INSERT INTO comments (post_id, author_id, content) VALUES ($1, $2, $3) RETURNING *',
    [postId, auth.userId, content.trim()]
  )
  return NextResponse.json({ data: res.rows[0] }, { status: 201 })
}
