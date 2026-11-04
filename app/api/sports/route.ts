import { NextResponse } from 'next/server'
import { useMockData } from '@/lib/db'
import { SPORTS } from '@/lib/mock-data'

export async function GET() {
  if (useMockData) {
    return NextResponse.json({ data: SPORTS })
  }
  const { prisma } = await import('@/lib/prisma')
  const sports = await prisma.sport.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json({ data: sports })
}
