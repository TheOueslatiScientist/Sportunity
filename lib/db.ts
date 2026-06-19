import { Pool } from 'pg'

let pool: Pool | null = null

export function getDb(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  }
  return pool
}

// When USE_MOCK_DATA=true  → in-memory arrays (local dev, no Supabase needed)
// When USE_MOCK_DATA=false → Prisma + Supabase (production)
export const useMockData = process.env.USE_MOCK_DATA !== 'false'
