import { NextResponse } from 'next/server'

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? ''
  const dbPassword = process.env.DB_PASSWORD ?? ''

  const urlInfo = dbUrl ? {
    hasUrl: true,
    host: dbUrl.includes('@') ? dbUrl.split('@')[1]?.split('/')[0] : 'unknown',
  } : { hasUrl: false }

  return NextResponse.json({
    dbPasswordSet: !!dbPassword,
    dbPasswordLength: dbPassword.length,
    dbPasswordFirstChar: dbPassword ? dbPassword[0] : null,
    urlInfo,
  })
}
