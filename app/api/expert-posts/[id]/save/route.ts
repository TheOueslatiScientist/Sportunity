import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { useMockData } from '@/lib/db'
import { EXPERT_POST_SAVES } from '@/lib/mock-data'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const { id } = await params
  const postId = parseInt(id)

  if (useMockData) {
    const existingIdx = EXPERT_POST_SAVES.findIndex((s) => s.post_id === postId && s.user_id === auth.userId)
    if (existingIdx !== -1) {
      EXPERT_POST_SAVES.splice(existingIdx, 1)
      return NextResponse.json({ data: { saved: false } })
    } else {
      EXPERT_POST_SAVES.push({ post_id: postId, user_id: auth.userId })
      return NextResponse.json({ data: { saved: true } })
    }
  }

  return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
}
