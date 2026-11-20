import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'

const MOCK_COMMENTS: any[] = []

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const matchId = parseInt(id)

  if (useMockData) {
    return NextResponse.json({ data: MOCK_COMMENTS.filter((c) => c.match_id === matchId) })
  }

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { data: rows } = await supabaseAdmin
    .from('match_comments')
    .select('id,matchId,authorId,content,createdAt')
    .eq('matchId', matchId)
    .order('createdAt', { ascending: true })

  if (!rows?.length) return NextResponse.json({ data: [] })

  const authorIds = [...new Set(rows.map((c: any) => c.authorId))]
  const { data: profiles } = await supabaseAdmin.from('profiles').select('id,name,avatarUrl').in('id', authorIds)
  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]))

  return NextResponse.json({
    data: rows.map((c: any) => ({
      id: c.id, match_id: c.matchId, author_id: c.authorId,
      author: profileMap[c.authorId] ? {
        id: profileMap[c.authorId].id,
        name: profileMap[c.authorId].name,
        avatar_url: profileMap[c.authorId].avatarUrl,
      } : null,
      content: c.content, created_at: c.createdAt,
    }))
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Connexion requise pour commenter.' }, { status: 401 })

  const { id } = await params
  const matchId = parseInt(id)
  const { content } = await req.json()

  if (!content?.trim())
    return NextResponse.json({ error: 'Le commentaire ne peut pas être vide.' }, { status: 400 })

  if (useMockData) {
    const comment = {
      id: MOCK_COMMENTS.length + 1, match_id: matchId,
      author_id: auth.userId, content: content.trim(),
      created_at: new Date().toISOString(),
    }
    MOCK_COMMENTS.push(comment)
    return NextResponse.json({ data: comment }, { status: 201 })
  }

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { data: comment, error } = await supabaseAdmin
    .from('match_comments')
    .insert({ matchId, authorId: auth.userId as number, content: content.trim() })
    .select('id,matchId,authorId,content,createdAt')
    .single()

  if (error) {
    console.error('[POST /api/matches/[id]/comments]', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }

  const { data: author } = await supabaseAdmin.from('profiles').select('id,name,avatarUrl').eq('id', auth.userId as number).single()

  return NextResponse.json({
    data: {
      id: comment.id, match_id: comment.matchId, author_id: comment.authorId,
      author: author ? { id: author.id, name: author.name, avatar_url: author.avatarUrl } : null,
      content: comment.content, created_at: comment.createdAt,
    }
  }, { status: 201 })
}
