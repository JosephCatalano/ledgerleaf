import { NextRequest } from "next/server"
import { GET, POST, PUT, DELETE } from "../../transactions/route"
import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth"

jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    account: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    transaction: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}))

const mockUser = { id: "user-1", email: "test@example.com" }
const mockAccount = { id: "acct-1", userId: "user-1", name: "Test Account" }

describe("/api/transactions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: mockUser })
  })

  describe("GET", () => {
    it("should fetch transactions", async () => {
      ;(prisma.transaction.count as jest.Mock).mockResolvedValue(1)
      ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue([
        { id: "txn-1", description: "Test" },
      ])

      const req = new NextRequest("http://localhost/api/transactions?page=1&pageSize=10")
      const res = await GET(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data[0].description).toBe("Test")
    })
  })

  describe("POST", () => {
    it("should create a transaction", async () => {
      ;(prisma.transaction.create as jest.Mock).mockResolvedValue({
        id: "txn-1",
        description: "New Transaction",
      })

      const req = new NextRequest("http://localhost/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          accountId: mockAccount.id,
          description: "New Transaction",
          amount: 100,
          date: new Date().toISOString(),
          type: "EXPENSE",
        }),
      })

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.description).toBe("New Transaction")
    })
  })

  describe("PUT", () => {
    it("should update a transaction", async () => {
      ;(prisma.transaction.findFirst as jest.Mock).mockResolvedValue({ id: "txn-1" })
      ;(prisma.transaction.update as jest.Mock).mockResolvedValue({
        id: "txn-1",
        description: "Updated Transaction",
      })

      const req = new NextRequest("http://localhost/api/transactions/txn-1", {
        method: "PUT",
        body: JSON.stringify({ description: "Updated Transaction" }),
      })

      const res = await PUT(req, { params: Promise.resolve({ id: "txn-1" }) })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.transaction.description).toBe("Updated Transaction")
    })
  })

  describe("DELETE", () => {
    it("should delete a transaction", async () => {
      ;(prisma.transaction.findFirst as jest.Mock).mockResolvedValue({ id: "txn-1" })
      ;(prisma.transaction.delete as jest.Mock).mockResolvedValue({ id: "txn-1" })

      const req = new NextRequest("http://localhost/api/transactions/txn-1", {
        method: "DELETE",
      })

      const res = await DELETE(req, { params: Promise.resolve({ id: "txn-1" }) })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})