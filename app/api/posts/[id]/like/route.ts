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

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const userId = auth.userId as number

  const { data: existing } = await supabaseAdmin
    .from('post_likes')
    .select('postId')
    .eq('postId', postId)
    .eq('profileId', userId)
    .single()

  if (existing) {
    await supabaseAdmin.from('post_likes').delete().eq('postId', postId).eq('profileId', userId)
    const { data: post } = await supabaseAdmin.from('posts').update({ likes: supabaseAdmin.rpc ? undefined : undefined }).select('likes').eq('id', postId).single()
    // Decrement manually
    const { data: p } = await supabaseAdmin.from('posts').select('likes').eq('id', postId).single()
    const newLikes = Math.max(0, (p?.likes ?? 1) - 1)
    await supabaseAdmin.from('posts').update({ likes: newLikes }).eq('id', postId)
    return NextResponse.json({ data: { liked: false, likes: newLikes } })
  } else {
    await supabaseAdmin.from('post_likes').insert({ postId, profileId: userId })
    const { data: p } = await supabaseAdmin.from('posts').select('likes').eq('id', postId).single()
    const newLikes = (p?.likes ?? 0) + 1
    await supabaseAdmin.from('posts').update({ likes: newLikes }).eq('id', postId)
    return NextResponse.json({ data: { liked: true, likes: newLikes } })
  }
}
