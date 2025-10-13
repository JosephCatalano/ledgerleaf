/* src/lib/rules/engine.ts */
import { prisma } from "@/lib/db"

export type RuleInput = {
  id: string
  userId: string
  priority: number
  field: "merchant" | "description" | "amount"
  pattern: string // "text" or "regex:/.../i"
  categoryId?: string | null
}

export type TxLite = {
  id: string
  merchant: string
  description: string
  amount: number
}

function makeMatcher(pattern: string): (s: string) => boolean {
  const p = pattern.trim()
  if (p.startsWith("regex:/") && p.endsWith("/")) {
    const bodyAndFlags = p.slice("regex:/".length, -1)
    const lastSlash = bodyAndFlags.lastIndexOf("/")
    if (lastSlash > 0) {
      const body = bodyAndFlags.slice(0, lastSlash)
      const flags = bodyAndFlags.slice(lastSlash + 1)
      const re = new RegExp(body, flags)
      return (s: string) => re.test(s ?? "")
    } else {
      const re = new RegExp(bodyAndFlags)
      return (s: string) => re.test(s ?? "")
    }
  }
  const needle = p.toLowerCase()
  return (s: string) => (s ?? "").toLowerCase().includes(needle)
}

export function compileRule(r: RuleInput) {
  const match = makeMatcher(r.pattern)
  return {
    ...r,
    matches(tx: TxLite) {
      switch (r.field) {
        case "merchant":
          return match(tx.merchant)
        case "description":
          return match(tx.description)
        case "amount":
          return match(String(tx.amount))
        default:
          return false
      }
    },
  }
}

export async function fetchUserRules(userId: string) {
  const rules = await prisma.rule.findMany({
    where: { userId },
    orderBy: { priority: "asc" },
    include: { category: true },
  })
  return rules.map((r) =>
    compileRule({
      id: r.id,
      userId: r.userId,
      priority: r.priority,
      field: r.field as any,
      pattern: r.pattern,
      categoryId: r.categoryId ?? null,
    })
  )
}

export async function ensureUncategorized() {
  let c = await prisma.category.findFirst({ where: { name: "Uncategorized" } })
  if (!c) c = await prisma.category.create({ data: { name: "Uncategorized" } })
  return c
}

export function applyRulesToBatch(
  rules: ReturnType<typeof compileRule>[],
  txs: TxLite[],
  defaultCategoryId: string | null
) {
  return txs.map((tx) => {
    for (const r of rules) {
      if (r.matches(tx)) {
        return { txId: tx.id, categoryId: r.categoryId ?? defaultCategoryId, matchedRuleId: r.id }
      }
    }
    return { txId: tx.id, categoryId: defaultCategoryId, matchedRuleId: null }
  })
}
