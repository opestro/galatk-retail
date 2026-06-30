import { PrismaClient } from '@prisma/client'

const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/test-postgres'

const resolveDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }

  const nodeEnv = process.env.NODE_ENV ?? 'dev'
  if (nodeEnv === 'dev') {
    return DEFAULT_DATABASE_URL
  }

  throw new Error('DATABASE_URL is not set. Provide it in config/.env.dev or the runtime environment.')
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: resolveDatabaseUrl(),
    },
  },
})

export default prisma
