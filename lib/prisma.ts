import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient() {
  const pool = process.env.DB_PASSWORD
    ? new Pool({
        host: 'aws-1-eu-central-1.pooler.supabase.com',
        port: 6543,
        database: 'postgres',
        user: 'postgres.nxotvuxyhjmlrbpzbudg',
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
      })
    : new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
