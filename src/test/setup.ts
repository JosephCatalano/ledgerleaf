import '@testing-library/jest-dom'
import { vi } from 'vitest'

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
    user: { id: 'test-user-id' }
  }))
}))