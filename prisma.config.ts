import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'
import { resolve } from 'path'

// Charger .env.local pour le CLI Prisma
config({ path: resolve(process.cwd(), '.env.local') })

const DATABASE_URL = process.env.DATABASE_URL!
const DIRECT_URL = process.env.DIRECT_URL ?? DATABASE_URL

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: DIRECT_URL,
  },
  migrate: {
    async adapter() {
      const { Pool } = await import('pg')
      const pool = new Pool({
        connectionString: DIRECT_URL,
        ssl: { rejectUnauthorized: false },
      })
      return new PrismaPg(pool)
    },
  },
})
