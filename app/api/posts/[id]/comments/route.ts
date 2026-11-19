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

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { data: rows } = await supabaseAdmin
    .from('comments')
    .select('id, postId, content, createdAt, authorId')
    .eq('postId', postId)
    .order('createdAt', { ascending: true })

  if (!rows?.length) return NextResponse.json({ data: [] })

  const authorIds = [...new Set(rows.map((c: any) => c.authorId))]
  const { data: authors } = await supabaseAdmin.from('profiles').select('id,name,avatarUrl,isCoach').in('id', authorIds)
  const authorMap = Object.fromEntries((authors ?? []).map((a: any) => [a.id, a]))

  const data = rows.map((c: any) => {
    const a = authorMap[c.authorId]
    return {
      id: c.id, post_id: c.postId, content: c.content, created_at: c.createdAt,
      author: a ? { id: a.id, name: a.name, avatar_url: a.avatarUrl, is_coach: a.isCoach } : null,
    }
  })
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

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { data: comment, error } = await supabaseAdmin
    .from('comments')
    .insert({ postId, authorId: auth.userId as number, content: content.trim() })
    .select()
    .single()
  if (error) throw error

  const { data: author } = await supabaseAdmin.from('profiles').select('id,name,avatarUrl,isCoach').eq('id', auth.userId as number).single()
  return NextResponse.json({
    data: {
      id: comment.id, post_id: comment.postId, content: comment.content, created_at: comment.createdAt,
      author: author ? { id: author.id, name: author.name, avatar_url: author.avatarUrl, is_coach: author.isCoach } : null,
    },
  }, { status: 201 })
}
