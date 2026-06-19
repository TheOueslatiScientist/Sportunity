import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { POSTS, POST_LIKES } from '@/lib/mock-data'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const postId = parseInt(id)

  if (useMockData) {
    const post = POSTS.find((p) => p.id === postId)
    if (!post) return NextResponse.json({ error: 'Post introuvable.' }, { status: 404 })

    const likeIdx = POST_LIKES.findIndex((l) => l.post_id === postId && l.user_id === auth.userId)
    if (likeIdx !== -1) {
      // Unlike
      POST_LIKES.splice(likeIdx, 1)
      post.likes = Math.max(0, post.likes - 1)
      return NextResponse.json({ data: { liked: false, likes: post.likes } })
    } else {
      // Like
      POST_LIKES.push({ post_id: postId, user_id: auth.userId })
      post.likes += 1
      return NextResponse.json({ data: { liked: true, likes: post.likes } })
    }
  }

  const { getDb } = await import('@/lib/db')
  const db = getDb()

  try {
    await db.query('INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)', [postId, auth.userId])
    await db.query('UPDATE posts SET likes = likes + 1 WHERE id = $1', [postId])
    const res = await db.query('SELECT likes FROM posts WHERE id = $1', [postId])
    return NextResponse.json({ data: { liked: true, likes: res.rows[0].likes } })
  } catch {
    // Already liked → unlike
    await db.query('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [postId, auth.userId])
    await db.query('UPDATE posts SET likes = GREATEST(0, likes - 1) WHERE id = $1', [postId])
    const res = await db.query('SELECT likes FROM posts WHERE id = $1', [postId])
    return NextResponse.json({ data: { liked: false, likes: res.rows[0].likes } })
  }
}
