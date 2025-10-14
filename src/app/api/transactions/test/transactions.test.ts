import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { GET, POST } from '@/app/api/transactions/route'
import { PUT, DELETE } from '@/app/api/transactions/[id]/route'
import { Prisma } from '@prisma/client'

describe('Transactions API', () => {
  let testAccountId: string

  const createTestRequest = (method: string, urlString: string, body?: any) => {
    const url = new URL(urlString)
    return new NextRequest(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      ...(body && {
        body: JSON.stringify(body)
      })
    })
  }

  beforeEach(async () => {
    try {
      // Clear all existing data
      await prisma.$transaction([
        prisma.transactionTag.deleteMany(),
        prisma.transaction.deleteMany(),
        prisma.account.deleteMany(),
        prisma.user.deleteMany(),
        prisma.merchant.deleteMany(),
        prisma.category.deleteMany(),
        prisma.tag.deleteMany()
      ])

      // Create test user
      const testUser = await prisma.user.create({
        data: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          accounts: {
            create: {
              name: 'Test Account',
              type: 'CHECKING'
            }
          }
        },
        include: {
          accounts: true
        }
      })

      testAccountId = testUser.accounts[0].id

    } catch (error) {
      console.error('Setup error:', error)
      throw error
    }
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('POST /api/transactions', () => {
    it('should create a new transaction', async () => {
      const response = await POST(createTestRequest('POST', 'http://localhost:3000/api/transactions', {
        accountId: testAccountId,
        description: 'Test Transaction',
        amount: '50.00',
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
      const response = await POST(createTestRequest('POST', 'http://localhost:3000/api/transactions', {
        // Missing required fields
      }))

      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toMatch(/required/)
    })
  })

  describe('GET /api/transactions', () => {
    let testTransaction: any

    beforeEach(async () => {
      testTransaction = await prisma.transaction.create({
        data: {
          accountId: testAccountId,
          userId: 'test-user-id',
          description: 'Test Transaction',
          amount: new Prisma.Decimal(50.00),
          date: new Date('2025-10-13'),
          type: 'EXPENSE'
        }
      })
    })

    it('should list transactions with pagination', async () => {
      const response = await GET(createTestRequest('GET', 'http://localhost:3000/api/transactions'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('data')
      expect(data).toHaveProperty('total')
      expect(data).toHaveProperty('page')
      expect(data.data.length).toBeGreaterThan(0)
      expect(data.data[0]).toHaveProperty('id')
      expect(data.data[0].description).toBe('Test Transaction')
    })

    it('should filter transactions', async () => {
      // Create another transaction with different date
      await prisma.transaction.create({
        data: {
          accountId: testAccountId,
          userId: 'test-user-id',
          description: 'Another Transaction',
          amount: new Prisma.Decimal(75.00),
          date: new Date('2025-11-13'),
          type: 'EXPENSE'
        }
      })

      const response = await GET(
        createTestRequest('GET', 'http://localhost:3000/api/transactions?startDate=2025-10-01&endDate=2025-10-31')
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.length).toBe(1)
      expect(data.data[0].description).toBe('Test Transaction')
    })
  })

  describe('PUT /api/transactions/[id]', () => {
    let testTransaction: any

    beforeEach(async () => {
      testTransaction = await prisma.transaction.create({
        data: {
          accountId: testAccountId,
          userId: 'test-user-id',
          description: 'Test Transaction',
          amount: new Prisma.Decimal(50.00),
          date: new Date('2025-10-13'),
          type: 'EXPENSE'
        }
      })
    })

    it('should update a transaction', async () => {
      const url = 'http://localhost:3000/api/transactions/' + testTransaction.id
      const request = createTestRequest('PUT', url, {
        description: 'Updated Transaction',
        amount: '75.00'
      })

      const response = await PUT(request, { params: Promise.resolve({ id: testTransaction.id }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.description).toBe('Updated Transaction')
      expect(Number(data.amount)).toBe(75)
    })

    it('should validate transaction ownership', async () => {
      // Create another user and account
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
          userId: otherUser.id
        }
      })

      // Try to update transaction with wrong user
      const url = 'http://localhost:3000/api/transactions/' + testTransaction.id
      const request = createTestRequest('PUT', url, {
        description: 'Should Not Update',
        amount: '100.00'
      })

      vi.mocked(request.headers.get).mockImplementation((name) => {
        if (name === 'authorization') return 'Bearer other-user-token'
        return null
      })

      const response = await PUT(request, { params: Promise.resolve({ id: testTransaction.id }) })
      expect(response.status).toBe(403)
    })
  })

  describe('DELETE /api/transactions/[id]', () => {
    let testTransaction: any

    beforeEach(async () => {
      testTransaction = await prisma.transaction.create({
        data: {
          accountId: testAccountId,
          userId: 'test-user-id',
          description: 'Test Transaction',
          amount: new Prisma.Decimal(50.00),
          date: new Date('2025-10-13'),
          type: 'EXPENSE'
        }
      })
    })

    it('should delete a transaction', async () => {
      const url = 'http://localhost:3000/api/transactions/' + testTransaction.id
      const request = createTestRequest('DELETE', url)
      const response = await DELETE(request, { params: Promise.resolve({ id: testTransaction.id }) })

      expect(response.status).toBe(200)

      // Verify deletion
      const deleted = await prisma.transaction.findUnique({
        where: { id: testTransaction.id }
      })
      expect(deleted).toBeNull()
    })

    it('should validate transaction ownership before deletion', async () => {
      // Create another user and account
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
          userId: otherUser.id
        }
      })

      // Try to delete with wrong user
      const url = 'http://localhost:3000/api/transactions/' + testTransaction.id
      const request = createTestRequest('DELETE', url)
      
      vi.mocked(request.headers.get).mockImplementation((name) => {
        if (name === 'authorization') return 'Bearer other-user-token'
        return null
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: testTransaction.id }) })
      expect(response.status).toBe(403)
    })
  })

})