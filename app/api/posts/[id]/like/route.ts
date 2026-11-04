import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { POSTS, POST_LIKES } from '@/lib/mock-data'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const postId = parseInt(id)

  if (useMockData) {
    const post = POSTS.find((p) => p.id === postId)
    if (!post) return NextResponse.json({ error: 'Post introuvable.' }, { status: 404 })
    const likeIdx = POST_LIKES.findIndex((l) => l.post_id === postId && l.user_id === auth.userId)
    if (likeIdx !== -1) {
      POST_LIKES.splice(likeIdx, 1)
      post.likes = Math.max(0, post.likes - 1)
      return NextResponse.json({ data: { liked: false, likes: post.likes } })
    } else {
      POST_LIKES.push({ post_id: postId, user_id: auth.userId })
      post.likes += 1
      return NextResponse.json({ data: { liked: true, likes: post.likes } })
    }
  }

  const { prisma } = await import('@/lib/prisma')
  const userId = auth.userId as number

  const existing = await prisma.postLike.findUnique({
    where: { postId_profileId: { postId, profileId: userId } },
  })

  if (existing) {
    await prisma.postLike.delete({ where: { postId_profileId: { postId, profileId: userId } } })
    const post = await prisma.post.update({ where: { id: postId }, data: { likes: { decrement: 1 } } })
    return NextResponse.json({ data: { liked: false, likes: Math.max(0, post.likes) } })
  } else {
    await prisma.postLike.create({ data: { postId, profileId: userId } })
    const post = await prisma.post.update({ where: { id: postId }, data: { likes: { increment: 1 } } })
    return NextResponse.json({ data: { liked: true, likes: post.likes } })
  }
}
