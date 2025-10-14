import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

// Mock NextAuth session
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve({
    user: { id: 'test-user-id' }
  }))
}))

describe('Transactions API', () => {
  let testAccountId: string

  // Mock implementations
  const mockRequest = (method: string, url: string, body?: any) => {
    return new NextRequest(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      ...(body && {
        body: JSON.stringify(body)
      })
    })
  }

  // Create a test user and account before running tests
  beforeEach(async () => {
    // First clean up any existing data
    await prisma.$transaction([
      prisma.transaction.deleteMany(),
      prisma.account.deleteMany(),
      prisma.user.deleteMany()
    ])

    // Create test user first
    const user = await prisma.user.create({
      data: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      }
    })

    // Then create test account
    const testAccount = await prisma.account.create({
      data: {
        name: 'Test Account',
        userId: user.id,
        type: 'CHECKING'
      }
    })
    testAccountId = testAccount.id
  })

  // Clean up after tests
  afterEach(async () => {
    await prisma.$transaction([
      prisma.transaction.deleteMany(),
      prisma.account.deleteMany(),
      prisma.user.deleteMany()
    ])
  })

  describe('POST /api/transactions', () => {
    it('should create a new transaction', async () => {
      const { POST } = await import('../route')
      const response = await POST(mockRequest('POST', 'http://localhost:3000/api/transactions', {
        accountId: testAccountId,
        description: 'Test Transaction',
        amount: 50.00,
        date: '2025-10-13',
        type: 'EXPENSE'
      }))

      const data = await response.json()
      expect(response.status).toBe(201)
      expect(data).toHaveProperty('id')
      expect(data.description).toBe('Test Transaction')
      expect(Number(data.amount)).toBe(50)
      expect(data.type).toBe('EXPENSE')
    })

    it('should validate required fields', async () => {
      const { POST } = await import('../route')
      const response = await POST(mockRequest('POST', 'http://localhost:3000/api/transactions', {
        description: 'Missing Required Fields'
      }))

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/transactions', () => {
    let testTransactionId: string

    beforeEach(async () => {
      const transaction = await prisma.transaction.create({
        data: {
          accountId: testAccountId,
          description: 'Test Transaction',
          amount: 50,
          date: new Date('2025-10-13'),
          type: 'EXPENSE',
          userId: 'test-user-id'
        }
      })
      testTransactionId = transaction.id
    })

    it('should list transactions with pagination', async () => {
      const { GET } = await import('../route')
      const response = await GET(mockRequest('GET', 'http://localhost:3000/api/transactions?page=1&pageSize=10'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('data')
      expect(data).toHaveProperty('total')
      expect(data).toHaveProperty('page')
      expect(data.data.length).toBeGreaterThan(0)
    })

    it('should filter transactions', async () => {
      const { GET } = await import('../route')
      const response = await GET(mockRequest('GET', 'http://localhost:3000/api/transactions?q=Test'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.length).toBeGreaterThan(0)
      expect(data.data[0].description).toContain('Test')
    })
  })

  describe('PUT /api/transactions/[id]', () => {
    let testTransactionId: string

    beforeEach(async () => {
      const transaction = await prisma.transaction.create({
        data: {
          accountId: testAccountId,
          description: 'Original Transaction',
          amount: 50,
          date: new Date('2025-10-13'),
          type: 'EXPENSE',
          userId: 'test-user-id'
        }
      })
      testTransactionId = transaction.id
    })

    it('should update a transaction', async () => {
      const { PUT } = await import('../[id]/route')
      const response = await PUT(
        mockRequest('PUT', `http://localhost:3000/api/transactions/${testTransactionId}`, {
          description: 'Updated Transaction',
          amount: 75.00
        }),
        { params: Promise.resolve({ id: testTransactionId }) }
      )

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.transaction.description).toBe('Updated Transaction')
      expect(Number(data.transaction.amount)).toBe(75)
    })

    it('should validate transaction ownership', async () => {
      // Create another user
      const otherUser = await prisma.user.create({
        data: {
          id: 'other-user-id',
          email: 'other@example.com',
          name: 'Other User'
        }
      })
      
      // Create an account for the other user
      const otherAccount = await prisma.account.create({
        data: {
          name: 'Other Account',
          type: 'CHECKING',
          userId: otherUser.id
        }
      })
      
      // Create a transaction for the other user
      const otherTransaction = await prisma.transaction.create({
        data: {
          accountId: otherAccount.id,
          description: 'Other User Transaction',
          amount: 50,
          date: new Date('2025-10-13'),
          type: 'EXPENSE',
          userId: otherUser.id
        }
      })

      const { PUT } = await import('../[id]/route')
      const response = await PUT(
        mockRequest('PUT', `http://localhost:3000/api/transactions/${otherTransaction.id}`, {
          description: 'Attempted Update'
        }),
        { params: Promise.resolve({ id: otherTransaction.id }) }
      )

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/transactions/[id]', () => {
    let testTransactionId: string

    beforeEach(async () => {
      const transaction = await prisma.transaction.create({
        data: {
          accountId: testAccountId,
          description: 'To Be Deleted',
          amount: 50,
          date: new Date('2025-10-13'),
          type: 'EXPENSE',
          userId: 'test-user-id'
        }
      })
      testTransactionId = transaction.id
    })

    it('should delete a transaction', async () => {
      const { DELETE } = await import('../[id]/route')
      const response = await DELETE(
        mockRequest('DELETE', `http://localhost:3000/api/transactions/${testTransactionId}`),
        { params: Promise.resolve({ id: testTransactionId }) }
      )

      expect(response.status).toBe(200)

      const transaction = await prisma.transaction.findUnique({
        where: { id: testTransactionId }
      })
      expect(transaction).toBeNull()
    })

    it('should validate transaction ownership before deletion', async () => {
      // Create another user
      const otherUser = await prisma.user.create({
        data: {
          id: 'other-user-id',
          email: 'other@example.com',
          name: 'Other User'
        }
      })
      
      // Create an account for the other user
      const otherAccount = await prisma.account.create({
        data: {
          name: 'Other Account',
          type: 'CHECKING',
          userId: otherUser.id
        }
      })
      
      // Create a transaction for the other user
      const otherTransaction = await prisma.transaction.create({
        data: {
          accountId: otherAccount.id,
          description: 'Other User Transaction',
          amount: 50,
          date: new Date('2025-10-13'),
          type: 'EXPENSE',
          userId: otherUser.id
        }
      })

      const { DELETE } = await import('../[id]/route')
      const response = await DELETE(
        mockRequest('DELETE', `http://localhost:3000/api/transactions/${otherTransaction.id}`),
        { params: Promise.resolve({ id: otherTransaction.id }) }
      )

      expect(response.status).toBe(404)

      const transaction = await prisma.transaction.findUnique({
        where: { id: otherTransaction.id }
      })
      expect(transaction).not.toBeNull()
    })
  })
})