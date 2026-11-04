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

  const { prisma } = await import('@/lib/prisma')
  const comments = await prisma.comment.findMany({
    where: { postId },
    include: { author: true },
    orderBy: { createdAt: 'asc' },
  })
  const data = comments.map((c) => ({
    id: c.id, post_id: c.postId, content: c.content, created_at: c.createdAt,
    author: { id: c.author.id, name: c.author.name, avatar_url: c.author.avatarUrl, is_coach: c.author.isCoach },
  }))
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const postId = parseInt(id)
  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Le commentaire ne peut pas être vide.' }, { status: 400 })

  if (useMockData) {
    const author = PROFILES.find((p) => p.user_id === auth.userId)
    const comment = {
      id: getNextId(COMMENTS), post_id: postId, author_id: auth.userId,
      author, content: content.trim(), created_at: new Date().toISOString(),
    }
    COMMENTS.push(comment)
    return NextResponse.json({ data: comment }, { status: 201 })
  }

  const { prisma } = await import('@/lib/prisma')
  const comment = await prisma.comment.create({
    data: { postId, authorId: auth.userId as number, content: content.trim() },
    include: { author: true },
  })
  return NextResponse.json({ data: comment }, { status: 201 })
}
