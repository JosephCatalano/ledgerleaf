// src/app/api/rules/test/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { applyRulesToTransaction, type CandidateTxn } from "@/lib/rules/engine"
import type { Rule } from "@prisma/client"

// GET /api/rules/test?limit=20
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limitParam = searchParams.get("limit")
    const limit = Math.max(1, Math.min(Number(limitParam ?? "20"), 200))

    // 1) Load rules ordered by priority (smallest first)
    const rules: Rule[] = await prisma.rule.findMany({
      orderBy: { priority: "asc" },
    })

    // 2) Pull a small batch of recent transactions, include lowercase "merchant"
    const txns: CandidateTxn[] = await prisma.transaction.findMany({
      take: limit,
      orderBy: { date: "desc" },
      include: { merchant: true },
    })

    // 3) Collect merchant names (typed as string[]) for a quick existence check
    const merchantNames: string[] = Array.from(
      new Set(
        txns
          .map((t: CandidateTxn) => t.merchant?.name)
          .filter((v: string | undefined | null): v is string => !!v)
      )
    )

    // Optional: verify merchants exist (example query that uses typed array)
    if (merchantNames.length) {
      await prisma.merchant.findMany({
        where: { name: { in: merchantNames } },
        select: { id: true },
      })
    }

    // 4) Apply rules (fully typed – no implicit any)
    const evaluated = txns.map((t: CandidateTxn) => {
      const match = applyRulesToTransaction(t, rules)
      return {
        id: t.id,
        date: t.date,
        description: t.description,
        merchant: t.merchant?.name ?? null,
        existingCategoryId: t.categoryId ?? null,
        suggestedCategoryId: match?.categoryId ?? null,
        ruleId: match?.ruleId ?? null,
        reason: match?.reason ?? null,
      }
    })

    return NextResponse.json({
      count: evaluated.length,
      rules: rules.length,
      sample: evaluated,
    })
  } catch (err) {
    console.error("/api/rules/test error", err)
    return NextResponse.json(
      { error: "Failed to evaluate rules" },
      { status: 500 }
    )
  }
}
