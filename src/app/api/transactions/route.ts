// src/app/api/transactions/route.ts
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  sortBy: z.enum(["date", "amount", "description"]).default("date"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  q: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  merchantId: z.string().trim().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

type SortBy = z.infer<typeof querySchema>["sortBy"]
type SortDir = z.infer<typeof querySchema>["sortDir"]

const sortMap: Record<SortBy, Prisma.SortOrder> = {
  date: "desc",
  amount: "desc",
  description: "asc",
}

function buildOrderBy(sortBy: SortBy, sortDir: SortDir) {
  if (sortBy === "date") return { date: sortDir }
  if (sortBy === "amount") return { amount: sortDir }
  return { description: sortDir }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { page, pageSize, sortBy, sortDir, q, categoryId, merchantId, dateFrom, dateTo } =
    parsed.data

  const where: Prisma.TransactionWhereInput = {
    userId: session.user.id,
    ...(q ? { description: { contains: q, mode: "insensitive" } } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(merchantId ? { merchantId } : {}),
    ...(dateFrom || dateTo
      ? {
          date: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {}),
  }

  const [total, data] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: {
        merchant: true,
        category: true,
        account: { select: { id: true, name: true, last4: true } }, // <-- UPDATED
      },
      orderBy: [buildOrderBy(sortBy, sortDir)],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({
    data,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = (await req.json()) as {
    accountId: string
    description: string
    amount: string | number
    date: string
    type: "INCOME" | "EXPENSE" | "TRANSFER"
    categoryId?: string | null
    merchantId?: string | null
  }

  // minimal guard
  if (!body.accountId || !body.description || !body.amount || !body.date || !body.type) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const created = await prisma.transaction.create({
    data: {
      userId: session.user.id,
      accountId: body.accountId,
      description: body.description,
      amount: new Prisma.Decimal(body.amount),
      date: new Date(body.date),
      type: body.type,
      categoryId: body.categoryId ?? null,
      merchantId: body.merchantId ?? null,
    },
  })

  return NextResponse.json(created, { status: 201 })
}
