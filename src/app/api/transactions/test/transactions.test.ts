import { describe, it, expect, beforeEach, beforeAll, afterEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { GET, POST } from '@/app/api/transactions/route'
import { PUT, DELETE } from '@/app/api/transactions/[id]/route'

// Mock NextAuth session
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve({
    user: { id: 'test-user-id' }
  }))
}))

describe('Transactions API', () => {
  let testAccountId: string
  let testTransactionId: string

  // Mock implementations
  const mockRequest = (method: string, url: string, body?: any) => {
    return new NextRequest(url, {
      method,
      ...(body && {
        body: JSON.stringify(body)
      })
    })
  }

  // Reset database before all tests
  beforeAll(async () => {
    await prisma.transaction.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
  })

  // Create test user and account before each test
  beforeEach(async () => {
    try {
      // Clean up any test data from previous test
      await prisma.transaction.deleteMany();
      await prisma.account.deleteMany();
      await prisma.user.deleteMany();

      // Create test user first
      const testUser = await prisma.user.create({
        data: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
        }
      })

      // Then create test account
      const testAccount = await prisma.account.create({
        data: {
          name: 'Test Account',
          type: 'CHECKING',
          userId: testUser.id,
        }
      })
      testAccountId = testAccount.id
    } catch (error) {
      console.error('Setup error:', error)
      throw error
    }
  })

  // Clean up after tests
  afterEach(async () => {
    await prisma.transaction.deleteMany({
      where: { userId: 'test-user-id' }
    })
    await prisma.account.deleteMany({
      where: { userId: 'test-user-id' }
    })
    await prisma.user.deleteMany({
      where: { id: 'test-user-id' }
    })
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
    beforeEach(async () => {
      // Create a test transaction
      const transaction = await prisma.transaction.create({
        data: {
          accountId: testAccountId,
          description: 'Test Transaction',
          amount: new Prisma.Decimal(50),
          date: new Date('2025-10-13'),
          type: 'EXPENSE',
          userId: 'test-user-id'
        }
      })
      testTransactionId = transaction.id
    })

    it('should list transactions with pagination', async () => {
      const req = new NextRequest('http://localhost:3000/api/transactions?page=1&pageSize=10')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('data')
      expect(data).toHaveProperty('total')
      expect(data).toHaveProperty('page')
      expect(data.data.length).toBeGreaterThan(0)
    })

    it('should filter transactions', async () => {
      const req = new NextRequest('http://localhost:3000/api/transactions?q=Test')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.length).toBeGreaterThan(0)
      expect(data.data[0].description).toContain('Test')
    })
  })

  describe('PUT /api/transactions/[id]', () => {
    beforeEach(async () => {
      // Create a test transaction
      const transaction = await prisma.transaction.create({
        data: {
          accountId: testAccountId,
          description: 'Original Transaction',
          amount: new Prisma.Decimal(50),
          date: new Date('2025-10-13'),
          type: 'EXPENSE',
          userId: 'test-user-id'
        }
      })
      testTransactionId = transaction.id
    })

    it('should update a transaction', async () => {
      const req = new NextRequest(`http://localhost:3000/api/transactions/${testTransactionId}`, {
        method: 'PUT',
        body: JSON.stringify({
          description: 'Updated Transaction',
          amount: 75.00
        })
      })

      const response = await PUT(req, { params: Promise.resolve({ id: testTransactionId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transaction.description).toBe('Updated Transaction')
      expect(data.transaction.amount.toString()).toBe('75')
    })

    it('should validate transaction ownership', async () => {
      // Create another test user and account first
      const otherUser = await prisma.user.create({
        data: {
          id: 'other-user-id',
          email: 'other@example.com',
          name: 'Other User',
        }
      })

      const otherAccount = await prisma.account.create({
        data: {
          name: 'Other Account',
          type: 'CHECKING',
          userId: otherUser.id,
        }
      })

      // Create a transaction for the other user
      const otherTransaction = await prisma.transaction.create({
        data: {
          accountId: otherAccount.id,
          description: 'Other User Transaction',
          amount: new Prisma.Decimal(50),
          date: new Date('2025-10-13'),
          type: 'EXPENSE',
          userId: otherUser.id
        }
      })

      const req = new NextRequest(`http://localhost:3000/api/transactions/${otherTransaction.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          description: 'Attempted Update'
        })
      })

      const response = await PUT(req, { params: Promise.resolve({ id: otherTransaction.id }) })
      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/transactions/[id]', () => {
    beforeEach(async () => {
      // Create a test transaction
      const transaction = await prisma.transaction.create({
        data: {
          accountId: testAccountId,
          description: 'To Be Deleted',
          amount: new Prisma.Decimal(50),
          date: new Date('2025-10-13'),
          type: 'EXPENSE',
          userId: 'test-user-id'
        }
      })
      testTransactionId = transaction.id
    })

    it('should delete a transaction', async () => {
      const req = new NextRequest(`http://localhost:3000/api/transactions/${testTransactionId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(req, { params: Promise.resolve({ id: testTransactionId }) })
      expect(response.status).toBe(200)

      // Verify deletion
      const transaction = await prisma.transaction.findUnique({
        where: { id: testTransactionId }
      })
      expect(transaction).toBeNull()
    })

    it('should validate transaction ownership before deletion', async () => {
      // Create another test user and account first
      const otherUser = await prisma.user.create({
        data: {
          id: 'other-user-id',
          email: 'other@example.com',
          name: 'Other User',
        }
      })

      const otherAccount = await prisma.account.create({
        data: {
          name: 'Other Account',
          type: 'CHECKING',
          userId: otherUser.id,
        }
      })

      // Create a transaction for the other user
      const otherTransaction = await prisma.transaction.create({
        data: {
          accountId: otherAccount.id,
          description: 'Other User Transaction',
          amount: new Prisma.Decimal(50),
          date: new Date('2025-10-13'),
          type: 'EXPENSE',
          userId: otherUser.id
        }
      })

      const req = new NextRequest(`http://localhost:3000/api/transactions/${otherTransaction.id}`, {
        method: 'DELETE'
      })

      const response = await DELETE(req, { params: Promise.resolve({ id: otherTransaction.id }) })
      expect(response.status).toBe(404)

      // Verify transaction still exists
      const transaction = await prisma.transaction.findUnique({
        where: { id: otherTransaction.id }
      })
      expect(transaction).not.toBeNull()
    })
  })
})