import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 })

    if (file.size > MAX_SIZE_BYTES)
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo).' }, { status: 400 })

    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: 'Format non supporté. PDF, JPG ou PNG uniquement.' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf'
    const path = `${auth.userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    const { data, error } = await supabaseAdmin.storage
      .from('coach-docs')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('[upload coach-docs]', error)
      return NextResponse.json({ error: 'Erreur lors de l\'upload. Réessayez.' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage.from('coach-docs').getPublicUrl(data.path)

    return NextResponse.json({ url: publicUrl, path: data.path, name: file.name })
  } catch (err) {
    console.error('[POST /api/upload/coach-docs]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
