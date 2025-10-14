// src/app/api/rules/test/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { applyRulesToTransaction, type CandidateTxn } from "@/lib/rules/engine"
import type { Rule } from "@prisma/client"

export const dynamic = "force-dynamic" // avoids edge/runtime confusion in dev

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const limit = typeof body.limit === "number" ? body.limit : 20

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

    // 3) Evaluate
    const results = txns.map((t) => {
      const match = applyRulesToTransaction(t, rules)
      return {
        txId: t.id,
        categoryId: match?.categoryId ?? null,
        matchedRuleId: match?.ruleId ?? null,
      }
    })

    return NextResponse.json({
      count: results.length,
      rules,
      results,
    })
  } catch (err) {
    console.error("/api/rules/test error", err)
    return NextResponse.json(
      { error: "Failed to evaluate rules" },
      { status: 500 }
    )
  }
}