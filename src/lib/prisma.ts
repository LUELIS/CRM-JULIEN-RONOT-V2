import { PrismaClient } from '@/generated/prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

// Parse DATABASE_URL to extract connection parameters
function parseDbUrl(url: string) {
  const regex = /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/
  const match = url.match(regex)
  if (!match) throw new Error('Invalid DATABASE_URL format')
  return {
    user: match[1],
    password: decodeURIComponent(match[2]),
    host: match[3],
    port: parseInt(match[4]),
    database: match[5].split('?')[0], // Remove query params if any
  }
}

let prismaInstance: PrismaClient | null = null

const createPrismaClient = (): PrismaClient => {
  if (prismaInstance) return prismaInstance

  try {
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      throw new Error('DATABASE_URL is not defined')
    }

    const dbConfig = parseDbUrl(dbUrl)

    const adapter = new PrismaMariaDb({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      connectionLimit: 10,
    })

    prismaInstance = new PrismaClient({ adapter })
    return prismaInstance
  } catch (error) {
    console.error('Failed to create Prisma client:', error)
    throw error
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
