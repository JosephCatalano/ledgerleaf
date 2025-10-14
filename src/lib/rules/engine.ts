// src/lib/rules/engine.ts
import type { Rule, Transaction, Merchant } from "@prisma/client"

export type CandidateTxn = Transaction & { merchant?: Merchant | null }

export type RuleMatch = {
  ruleId: string
  categoryId: string | null
  reason: string
}

export function applyRulesToTransaction(
  txn: CandidateTxn,
  rules: Rule[]
): RuleMatch | null {
  // super simple matcher: substring on description or merchant name, case-insensitive
  const haystacks = [
    txn.description ?? "",
    txn.merchant?.name ?? "",
    txn.merchant?.normalizedName ?? "",
  ]
    .filter(Boolean)
    .map((s) => s.toLowerCase())

  for (const r of rules) {
    const needle = (r.pattern ?? "").toLowerCase()
    if (!needle) continue
    const hit = haystacks.some((h) => h.includes(needle))
    if (hit) {
      return {
        ruleId: r.id,
        categoryId: r.categoryId ?? null,
        reason: `pattern "${r.pattern}" matched`,
      }
    }
  }
  return null
}
