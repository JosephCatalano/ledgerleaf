/* src/app/api/rules/test/route.ts */
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { applyRulesToBatch, ensureUncategorized, fetchUserRules, TxLite } from "@/lib/rules/engine"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type TxRow = {
  id: string
  description: string
  amount: number
  type: "INCOME" | "EXPENSE"
  date: Date
  accountId: string
  merchantId: string | null
}

// POST { limit?: number } => run rules over last N transactions
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 })

  const { limit = 20 } = (await req.json().catch(() => ({ limit: 20 as number }))) as { limit?: number }
  const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 200)

  const [rules, uncategorized, txs] = await Promise.all([
    fetchUserRules(user.id),
    ensureUncategorized(),
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: safeLimit,
      select: {
        id: true,
        description: true,
        amount: true,
        type: true,
        date: true,
        accountId: true,
        merchantId: true,
      },
      // NOTE: no `include: { Merchant: ... }` — relation name is `merchant` if you need it
    }),
  ])

  // Gather merchant names in one query
  const merchantIds = Array.from(
    new Set(txs.map((t) => t.merchantId).filter((v): v is string => Boolean(v)))
  )
  const merchantMap = new Map<string, string>()
  if (merchantIds.length) {
    const merchants = await prisma.merchant.findMany({
      where: { id: { in: merchantIds } },
      select: { id: true, name: true },
    })
    merchants.forEach((m) => merchantMap.set(m.id, m.name))
  }

  const lite: TxLite[] = (txs as TxRow[]).map((t: TxRow) => ({
    id: t.id,
    merchant: t.merchantId ? merchantMap.get(t.merchantId) ?? "" : "",
    description: t.description,
    amount: t.amount,
  }))

  const results = applyRulesToBatch(rules, lite, uncategorized.id)

  return NextResponse.json({
    count: lite.length,
    rules: rules.map((r) => ({
      id: r.id,
      priority: r.priority,
      field: r.field,
      pattern: r.pattern,
      categoryId: r.categoryId,
    })),
    results,
  })
}
