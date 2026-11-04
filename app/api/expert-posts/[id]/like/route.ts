import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { EXPERT_POSTS, EXPERT_POST_LIKES } from '@/lib/mock-data'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const postId = parseInt(id)

  if (useMockData) {
    const post = EXPERT_POSTS.find((p) => p.id === postId)
    if (!post) return NextResponse.json({ error: 'Article introuvable.' }, { status: 404 })

    const existingIdx = EXPERT_POST_LIKES.findIndex((l) => l.post_id === postId && l.user_id === auth.userId)
    if (existingIdx !== -1) {
      EXPERT_POST_LIKES.splice(existingIdx, 1)
      post.likes = Math.max(0, post.likes - 1)
      return NextResponse.json({ data: { liked: false, likes: post.likes } })
    } else {
      EXPERT_POST_LIKES.push({ post_id: postId, user_id: auth.userId })
      post.likes += 1
      return NextResponse.json({ data: { liked: true, likes: post.likes } })
    }
  }

  return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
}
