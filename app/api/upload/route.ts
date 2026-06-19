import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { getUserFromRequest } from '@/lib/auth'

const ALLOWED_IMAGE = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
const ALLOWED_VIDEO = ['.mp4', '.mov', '.webm']
const MAX_SIZE_MB = 50

export async function POST(req: NextRequest) {
  const auth = getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 })

    const ext = extname(file.name).toLowerCase()
    const isImage = ALLOWED_IMAGE.includes(ext)
    const isVideo = ALLOWED_VIDEO.includes(ext)

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Format non supporté. Utilisez jpg, png, mp4 ou mov.' },
        { status: 400 }
      )
    }

    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > MAX_SIZE_MB) {
      return NextResponse.json({ error: `Fichier trop lourd (max ${MAX_SIZE_MB}Mo).` }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Sanitize filename + add timestamp to avoid collisions
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filename = `${Date.now()}_${auth.userId}_${safeName}`

    const uploadDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })
    await writeFile(join(uploadDir, filename), buffer)

    return NextResponse.json({
      url: `/uploads/${filename}`,
      type: isVideo ? 'video' : 'image',
      name: file.name,
      size: file.size,
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/upload]', err)
    return NextResponse.json({ error: 'Erreur lors de l\'upload.' }, { status: 500 })
  }
}
