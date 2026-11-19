import { NextResponse } from 'next/server'
import { SPORTS } from '@/lib/mock-data'

export async function GET() {
  return NextResponse.json({ data: SPORTS })
}
