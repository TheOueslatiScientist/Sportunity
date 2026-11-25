import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
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
      .limit(100)

    if (type && type !== 'all') query = query.eq('type', type.toUpperCase())
    if (status && status !== 'all') query = query.eq('status', status.toUpperCase())
    if (isPublic === 'true') query = query.eq('"isPublic"', true)
    if (isPublic === 'false') query = query.eq('"isPublic"', false)

    const { data: rows, error } = await query
    if (error) throw new Error(error.message)

    const data = (rows ?? []).map((i: any) => ({
      id: i.id, name: i.name, type: i.type?.toLowerCase(),
      address: i.address, lat: i.lat, lng: i.lng,
      is_public: i.isPublic, status: i.status?.toLowerCase(),
      image_url: i.imageUrl, website_url: i.websiteUrl ?? null,
    }))

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[infrastructures]', err)
    return NextResponse.json({ error: String(err), data: [] }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })

  try {
    const { name, address, lat, lng, type, website_url } = await req.json()
    if (!name?.trim() || !address?.trim() || lat == null || lng == null)
      return NextResponse.json({ error: 'Nom, adresse et coordonnées sont requis.' }, { status: 400 })

    if (useMockData) {
      const club: any = {
        id: INFRASTRUCTURES.length + 1, name: name.trim(), type: type ?? 'other',
        address: address.trim(), lat, lng, is_public: false,
        status: 'available', website_url: website_url ?? null,
      }
      INFRASTRUCTURES.push(club)
      return NextResponse.json({ data: club }, { status: 201 })
    }

    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    const { data: club, error } = await supabaseAdmin
      .from('infrastructures')
      .insert({
        name: name.trim(), address: address.trim(), lat, lng,
        type: (type ?? 'other').toUpperCase(),
        isPublic: false, status: 'AVAILABLE',
        websiteUrl: website_url?.trim() || null,
        submittedById: auth.userId as number,
      })
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({
      data: {
        id: club.id, name: club.name, type: club.type?.toLowerCase(),
        address: club.address, lat: club.lat, lng: club.lng,
        is_public: false, status: 'available', website_url: club.websiteUrl,
      }
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/infrastructures]', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
