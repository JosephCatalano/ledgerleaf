import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

export const dynamic = "force-dynamic"

// Query parameters schema
const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
  sortBy: z.enum(["date", "amount", "description"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  categoryId: z.string().optional(),
  merchantId: z.string().optional(),
  accountId: z.string().optional(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).optional(),
  search: z.string().optional(),
})

// GET /api/transactions - Fetch transactions with filters, sorting, and pagination
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { searchParams } = new URL(req.url)

    // Parse and validate query parameters
    const params = QuerySchema.parse({
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
      categoryId: searchParams.get("categoryId"),
      merchantId: searchParams.get("merchantId"),
      accountId: searchParams.get("accountId"),
      type: searchParams.get("type"),
      search: searchParams.get("search"),
    })

    // Build where clause
    const where: {
      userId: string
      categoryId?: string | null
      merchantId?: string | null
      accountId?: string
      type?: "INCOME" | "EXPENSE" | "TRANSFER"
      OR?: Array<{ description: { contains: string; mode: "insensitive" } }>
    } = { userId }

    if (params.categoryId) {
      where.categoryId = params.categoryId === "uncategorized" ? null : params.categoryId
    }
    if (params.merchantId) where.merchantId = params.merchantId
    if (params.accountId) where.accountId = params.accountId
    if (params.type) where.type = params.type
    if (params.search) {
      where.OR = [
        { description: { contains: params.search, mode: "insensitive" } },
      ]
    }

    // Build orderBy clause
    const orderBy: Record<string, "asc" | "desc"> = {
      [params.sortBy]: params.sortOrder,
    }

    // Get total count for pagination
    const totalCount = await prisma.transaction.count({ where })

    // Fetch transactions
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        merchant: true,
        account: true,
      },
      orderBy,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    })

    const totalPages = Math.ceil(totalCount / params.pageSize)

    return NextResponse.json({
      transactions,
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        totalCount,
        totalPages,
      },
    })
  } catch (error) {
    console.error("GET /api/transactions error:", error)
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    )
  }
}

// POST /api/transactions - Create a new transaction
const CreateTransactionSchema = z.object({
  accountId: z.string(),
  merchantId: z.string().optional(),
  categoryId: z.string().optional(),
  date: z.string(),
  amount: z.number(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  description: z.string(),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await req.json()

    const validation = CreateTransactionSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data

    // Verify the account belongs to the user
    const account = await prisma.account.findFirst({
      where: { id: data.accountId, userId },
    })

    if (!account) {
      return NextResponse.json(
        { error: "Account not found or doesn't belong to user" },
        { status: 404 }
      )
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        accountId: data.accountId,
        merchantId: data.merchantId,
        categoryId: data.categoryId,
        date: new Date(data.date),
        amount: data.amount,
        type: data.type,
        description: data.description,
      },
      include: {
        category: true,
        merchant: true,
        account: true,
      },
    })

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (error) {
    console.error("POST /api/transactions error:", error)
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    )
  }
}
