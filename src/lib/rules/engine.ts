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
    if (haystacks.some((h) => h.includes(needle))) {
      return {
        ruleId: r.id,
        categoryId: r.categoryId ?? null,
        reason: `pattern "${r.pattern}" matched`,
      }
    }
  }
  return null
}
