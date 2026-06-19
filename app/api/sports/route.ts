import { NextResponse } from 'next/server'
import { useMockData } from '@/lib/db'
import { SPORTS } from '@/lib/mock-data'

export async function GET() {
  if (useMockData) {
    return NextResponse.json({ data: SPORTS })
  }
  const { getDb } = await import('@/lib/db')
  const db = getDb()
  const res = await db.query('SELECT * FROM sports ORDER BY name')
  return NextResponse.json({ data: res.rows })
}
