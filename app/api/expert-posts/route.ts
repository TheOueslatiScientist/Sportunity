import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { EXPERT_POSTS, EXPERT_COMMENTS, EXPERT_POST_LIKES, PROFILES, SPORTS, getNextId } from '@/lib/mock-data'

function serializeProfile(p: any) {
  return {
    id: p.id, user_id: p.id, name: p.name, avatar_url: p.avatarUrl,
    city: p.city, level: p.level?.toLowerCase(), is_coach: p.isCoach,
    role: p.role?.toLowerCase(), bio: p.bio,
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const sport    = searchParams.get('sport')
  const limit    = parseInt(searchParams.get('limit') ?? '20')
  const offset   = parseInt(searchParams.get('offset') ?? '0')

  const auth = await getUserFromRequest(req)

  if (useMockData) {
    let data = [...EXPERT_POSTS]
    if (category) data = data.filter((p) => p.category === category)
    if (sport && sport !== 'all')
      data = data.filter((p) => String(p.sport_id) === sport || p.sport?.name.toLowerCase() === sport.toLowerCase())
    data = data
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit)
      .map((p) => ({
        ...p,
        comments_count: EXPERT_COMMENTS.filter((c) => c.expert_post_id === p.id).length,
        liked: auth ? EXPERT_POST_LIKES.some((l) => l.post_id === p.id && l.user_id === auth.userId) : false,
      }))
    return NextResponse.json({ data })
  }

  try {
    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    let query = supabaseAdmin
      .from('expert_posts')
      .select('id,authorId,title,content,excerpt,category,sportId,likes,readTime,createdAt')
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1)

    if (category) query = query.eq('category', category.toUpperCase())

    const { data: rows } = await query
    if (!rows?.length) return NextResponse.json({ data: [] })

    const authorIds = [...new Set(rows.map((p: any) => p.authorId))]
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id,name,avatarUrl,city,level,isCoach,role,bio').in('id', authorIds)
    const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]))

    const postIds = rows.map((p: any) => p.id)
    const { data: commentsCount } = await supabaseAdmin
      .from('expert_comments')
      .select('postId')
      .in('postId', postIds)

    const countMap: Record<number, number> = {}
    for (const c of commentsCount ?? []) {
      countMap[c.postId] = (countMap[c.postId] ?? 0) + 1
    }

    let likedSet = new Set<number>()
    if (auth) {
      const { data: liked } = await supabaseAdmin.from('expert_post_likes')
        .select('postId').eq('profileId', auth.userId as number).in('postId', postIds)
      likedSet = new Set((liked ?? []).map((l: any) => l.postId))
    }

    const data = rows.map((p: any) => ({
      id: p.id, author_id: p.authorId, author: profileMap[p.authorId] ? serializeProfile(profileMap[p.authorId]) : null,
      title: p.title, content: p.content, excerpt: p.excerpt,
      category: p.category?.toLowerCase(), sport_id: p.sportId,
      likes: p.likes ?? 0, liked: likedSet.has(p.id), saved: false,
      comments_count: countMap[p.id] ?? 0,
      read_time: p.readTime, created_at: p.createdAt,
    }))

    if (sport && sport !== 'all') {
      const sportNum = parseInt(sport)
      return NextResponse.json({ data: data.filter((p) => p.sport_id === sportNum) })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[GET /api/expert-posts]', err)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  try {
    const body = await req.json()
    const { title, content, category, sport_id } = body

    if (!title?.trim() || !content?.trim() || !category)
      return NextResponse.json({ error: 'Titre, contenu et catégorie sont requis.' }, { status: 400 })

    const wordCount = content.trim().split(/\s+/).length
    const readTime = Math.max(1, Math.round(wordCount / 200))
    const excerpt = content.trim().split('\n')[0].replace(/\*\*/g, '').slice(0, 120) + '…'

    if (useMockData) {
      const author = PROFILES.find((p) => p.user_id === auth.userId)
      const sport = sport_id ? SPORTS.find((s) => s.id === sport_id) : undefined
      const newPost = {
        id: getNextId(EXPERT_POSTS), author_id: auth.userId, author, title: title.trim(),
        content: content.trim(), excerpt, category, sport_id, sport, media: [],
        likes: 0, liked: false, comments_count: 0, saved: false,
        read_time: readTime, created_at: new Date().toISOString(),
      }
      EXPERT_POSTS.unshift(newPost as any)
      return NextResponse.json({ data: newPost }, { status: 201 })
    }

    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    const { data: post, error } = await supabaseAdmin
      .from('expert_posts')
      .insert({
        authorId: auth.userId as number, title: title.trim(), content: content.trim(),
        excerpt, category: category.toUpperCase(), sportId: sport_id ?? null, readTime,
      })
      .select()
      .single()
    if (error) throw error

    const { data: author } = await supabaseAdmin.from('profiles').select('id,name,avatarUrl,city,level,isCoach,role,bio').eq('id', auth.userId as number).single()

    return NextResponse.json({
      data: {
        id: post.id, author_id: post.authorId, author: author ? serializeProfile(author) : null,
        title: post.title, content: post.content, excerpt: post.excerpt,
        category: post.category?.toLowerCase(), sport_id: post.sportId,
        likes: 0, liked: false, comments_count: 0, saved: false,
        read_time: post.readTime, created_at: post.createdAt,
      }
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/expert-posts]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
