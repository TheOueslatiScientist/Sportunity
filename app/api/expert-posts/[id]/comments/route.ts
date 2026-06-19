import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { EXPERT_POSTS, EXPERT_COMMENTS, PROFILES, getNextId } from '@/lib/mock-data'

// GET /api/expert-posts/[id]/comments
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postId = parseInt(id)

  if (useMockData) {
    const comments = EXPERT_COMMENTS
      .filter((c) => c.expert_post_id === postId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    return NextResponse.json({ data: comments })
  }

  return NextResponse.json({ data: [] })
}

// POST /api/expert-posts/[id]/comments
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const postId = parseInt(id)

  try {
    const { content } = await req.json()
    if (!content?.trim()) return NextResponse.json({ error: 'Commentaire vide.' }, { status: 400 })

    if (useMockData) {
      const post = EXPERT_POSTS.find((p) => p.id === postId)
      if (!post) return NextResponse.json({ error: 'Article introuvable.' }, { status: 404 })

      const author = PROFILES.find((p) => p.user_id === auth.userId)
      const newComment = {
        id: getNextId(EXPERT_COMMENTS),
        expert_post_id: postId,
        author_id: auth.userId,
        author,
        content: content.trim(),
        created_at: new Date().toISOString(),
      }
      EXPERT_COMMENTS.push(newComment)
      post.comments_count = EXPERT_COMMENTS.filter((c) => c.expert_post_id === postId).length

      return NextResponse.json({ data: newComment }, { status: 201 })
    }

    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  } catch (err) {
    console.error('[POST /api/expert-posts/[id]/comments]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
