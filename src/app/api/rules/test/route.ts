// src/app/api/rules/test/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { applyRulesToTransaction, type CandidateTxn } from "@/lib/rules/engine"
import type { Rule } from "@prisma/client"

export const dynamic = "force-dynamic" // avoids edge/runtime confusion in dev

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const limitParam = url.searchParams.get("limit") ?? "20"
    const parsed = Number(limitParam)
    const limit = Number.isFinite(parsed)
      ? Math.max(1, Math.min(parsed, 200))
      : 20

    // 1) Rules by priority
    const rules: Rule[] = await prisma.rule.findMany({
      orderBy: { priority: "asc" },
    })

    // 2) Latest transactions with merchant
    const txns: CandidateTxn[] = await prisma.transaction.findMany({
      take: limit,
      orderBy: { date: "desc" },
      include: { merchant: true }, // NOTE: lowercase key
    })

    // 3) Merchant names as string[]
    const merchantNames: string[] = Array.from(
      new Set(
        txns
          .map((t) => t.merchant?.name)
          .filter((v): v is string => typeof v === "string" && v.length > 0)
      )
    )

    if (merchantNames.length > 0) {
      // sanity check query that keeps types happy
      await prisma.merchant.findMany({
        where: { name: { in: merchantNames } },
        select: { id: true },
      })
    }

    // 4) Evaluate
    const evaluated = txns.map((t) => {
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
