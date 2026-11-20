import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_VIDEO = ['video/mp4', 'video/quicktime', 'video/webm']
const MAX_SIZE_MB = 50

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 })

    const isImage = ALLOWED_IMAGE.includes(file.type)
    const isVideo = ALLOWED_VIDEO.includes(file.type)
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'Format non supporté. Utilisez jpg, png, mp4 ou mov.' }, { status: 400 })
    }
    if (file.size / (1024 * 1024) > MAX_SIZE_MB) {
      return NextResponse.json({ error: `Fichier trop lourd (max ${MAX_SIZE_MB}Mo).` }, { status: 400 })
    }

    const { supabaseAdmin } = await import('@/lib/supabase-admin')

    // Ensure bucket exists
    await supabaseAdmin.storage.createBucket('media', { public: true }).catch(() => {})

    const ext = file.name.split('.').pop()?.toLowerCase() ?? (isVideo ? 'mp4' : 'jpg')
    const filename = `${Date.now()}_${auth.userId}.${ext}`
    const folder = isVideo ? 'videos' : 'images'
    const path = `${folder}/${filename}`

    const bytes = await file.arrayBuffer()
    const { error } = await supabaseAdmin.storage
      .from('media')
      .upload(path, bytes, { contentType: file.type, upsert: false })

    if (error) {
      console.error('[upload] Supabase storage error:', error)
      return NextResponse.json({ error: 'Erreur lors de l\'upload.' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(path)

    return NextResponse.json({ url: publicUrl, type: isVideo ? 'video' : 'image' }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/upload]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
