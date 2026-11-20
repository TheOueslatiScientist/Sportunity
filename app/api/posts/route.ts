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
      .map((p) => ({ ...p, comments_count: COMMENTS.filter((c) => c.post_id === p.id).length }))
    return NextResponse.json({ data })
  }

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { data: rows } = await supabaseAdmin
    .from('posts')
    .select('id, content, imageUrl, type, likes, createdAt, sportId, authorId')
    .order('createdAt', { ascending: false })
    .range(offset, offset + limit - 1)

  if (!rows?.length) return NextResponse.json({ data: [] })

  const authorIds = [...new Set(rows.map((p: any) => p.authorId))]
  const { data: authors } = await supabaseAdmin.from('profiles').select('id,name,avatarUrl,isCoach').in('id', authorIds)
  const authorMap = Object.fromEntries((authors ?? []).map((a: any) => [a.id, a]))

  const { data: commentCounts } = await supabaseAdmin
    .from('comments')
    .select('postId')
    .in('postId', rows.map((p: any) => p.id))

  const countMap: Record<number, number> = {}
  for (const c of commentCounts ?? []) {
    countMap[(c as any).postId] = (countMap[(c as any).postId] ?? 0) + 1
  }

  const data = rows.map((p: any) => {
    const a = authorMap[p.authorId]
    return {
      id: p.id, content: p.content, image_url: p.imageUrl, type: p.type, likes: p.likes,
      created_at: p.createdAt, sport_id: p.sportId,
      author: a ? { id: a.id, name: a.name, avatar_url: a.avatarUrl, is_coach: a.isCoach } : null,
      comments_count: countMap[p.id] ?? 0,
    }
  })

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  try {
    const body = await req.json()
    const { content, sport_id, image_url, type = 'post', media = [] } = body

    if (!content?.trim() && (!media || media.length === 0))
      return NextResponse.json({ error: 'Le contenu ou un média est requis.' }, { status: 400 })

    if (useMockData) {
      const author = PROFILES.find((p) => p.user_id === auth.userId)
      const sport = sport_id ? SPORTS.find((s) => s.id === sport_id) : undefined
      const newPost = {
        id: getNextId(POSTS), author_id: auth.userId, author, content: content?.trim() ?? '',
        image_url, media: media.length > 0 ? media : undefined, sport_id, sport,
        type, likes: 0, liked: false, comments_count: 0, created_at: new Date().toISOString(),
      }
      POSTS.unshift(newPost)
      return NextResponse.json({ data: newPost }, { status: 201 })
    }

    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    const mediaUrls = media.length > 0 ? media : (image_url ? [{ url: image_url, type: 'image' }] : [])
    const firstImageUrl = mediaUrls.length > 0 ? mediaUrls[0].url : null
    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .insert({ authorId: auth.userId as number, content: content?.trim() ?? '', imageUrl: firstImageUrl, sportId: sport_id ?? null, type })
      .select()
      .single()
    if (error) throw error

    const { data: author } = await supabaseAdmin.from('profiles').select('id,name,avatarUrl,isCoach').eq('id', auth.userId as number).single()
    return NextResponse.json({
      data: {
        id: post.id, content: post.content, image_url: post.imageUrl, media: mediaUrls, type: post.type,
        likes: 0, created_at: post.createdAt, sport_id: post.sportId, comments_count: 0,
        author: author ? { id: author.id, name: author.name, avatar_url: author.avatarUrl, is_coach: author.isCoach } : null,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/posts]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
