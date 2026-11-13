import { NextRequest, NextResponse } from 'next/server'
import { useMockData } from '@/lib/db'
import { INFRASTRUCTURES } from '@/lib/mock-data'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const isPublic = searchParams.get('public')

  if (useMockData) {
    let data = [...INFRASTRUCTURES]
    if (type && type !== 'all') data = data.filter((i) => i.type === type)
    if (status && status !== 'all') data = data.filter((i) => i.status === status)
    if (isPublic === 'true') data = data.filter((i) => i.is_public)
    if (isPublic === 'false') data = data.filter((i) => !i.is_public)
    return NextResponse.json({ data })
  }

  try {
    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    let query = supabaseAdmin
      .from('infrastructures')
      .select('id,name,type,address,lat,lng,"isPublic",status,"imageUrl"')
      .order('name')
      .limit(500)

    if (type && type !== 'all') query = query.eq('type', type.toUpperCase())
    if (status && status !== 'all') query = query.eq('status', status.toUpperCase())
    if (isPublic === 'true') query = query.eq('"isPublic"', true)
    if (isPublic === 'false') query = query.eq('"isPublic"', false)

    const { data: rows, error } = await query
    if (error) throw new Error(error.message)

    const data = (rows ?? []).map((i: any) => ({
      id: i.id, name: i.name, type: i.type.toLowerCase(),
      address: i.address, lat: i.lat, lng: i.lng,
      is_public: i.isPublic, status: i.status.toLowerCase(),
      image_url: i.imageUrl,
    }))

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[infrastructures]', err)
    return NextResponse.json({ error: String(err), data: [] }, { status: 500 })
  }
}
