import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const infraId = parseInt(id)
  if (isNaN(infraId)) return NextResponse.json({ error: 'ID invalide.' }, { status: 400 })

  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { data: i, error } = await supabaseAdmin
    .from('infrastructures')
    .select('id,name,type,address,lat,lng,"isPublic",status,"imageUrl","websiteUrl"')
    .eq('id', infraId)
    .single()

  if (error || !i) return NextResponse.json({ error: 'Terrain introuvable.' }, { status: 404 })

  return NextResponse.json({
    data: {
      id: i.id, name: i.name,
      type: (i.type ?? 'other').toLowerCase(),
      address: i.address, lat: i.lat, lng: i.lng,
      is_public: i.isPublic,
      status: (i.status ?? 'available').toLowerCase(),
      image_url: i.imageUrl ?? null,
      website_url: i.websiteUrl ?? null,
    },
  })
}
