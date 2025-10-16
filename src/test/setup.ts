import '@testing-library/jest-dom'
import { vi, beforeAll, beforeEach, afterAll, afterEach } from 'vitest'
import { prisma } from '@/lib/db'

// Database setup
let testId: string

beforeAll(async () => {
  await prisma.$connect()
  testId = `test-${Date.now()}`
})

afterAll(async () => {
  await prisma.$disconnect()
})

beforeEach(async () => {
  // Clean up all data
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename 
    FROM pg_tables
    WHERE schemaname='public'
  `

  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`)
      } catch (error) {
        console.log({ error })
      }
    }
  }
})

// Mock next/server
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: ResponseInit) => new Response(JSON.stringify(data), init),
  },
  NextRequest: class MockNextRequest extends Request {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      super(input, init)
    }
    nextUrl = new URL(this.url)
  }
}))

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve({
    user: { id: 'test-user-id', email: 'test@example.com' }
  }))
}))

// Mock fetch
global.fetch = vi.fn()

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks()
})