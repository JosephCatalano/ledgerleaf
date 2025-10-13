import { z } from "zod"

export const REQUIRED_FIELDS = ["date", "amount", "type", "description", "merchant"] as const
export type RequiredField = typeof REQUIRED_FIELDS[number]

export const MappingSchema = z.object({
  bankKey: z.string().min(1),
  date: z.string(),
  amount: z.string(),
  type: z.string(),
  description: z.string(),
  merchant: z.string(),
})

export type Mapping = z.infer<typeof MappingSchema>

const H = {
  date: ["date", "transaction date", "posted", "posting date", "value date"],
  amount: ["amount", "amt", "transaction amount", "debit", "credit"],
  type: ["type", "transaction type", "dr/cr", "direction"],
  description: ["description", "details", "narrative", "memo", "reference"],
  merchant: ["merchant", "payee", "name", "counterparty"],
}

export function guessMapping(headers: string[]): Omit<Mapping, "bankKey"> {
  const norm = (s: string) => s.toLowerCase().trim()
  const find = (candidates: string[]) =>
    headers.find((h) => {
      const n = norm(h)
      return candidates.some((c) => n.includes(c))
    }) ?? headers[0] // fallback to first column if not found

  return {
    date: find(H.date),
    amount: find(H.amount),
    type: find(H.type),
    description: find(H.description),
    merchant: find(H.merchant),
  }
}

/** derive a bank/preset key from filename (strip extension and junk) */
export function deriveBankKey(filename: string): string {
  if (!filename) return "unknown"
  const base = filename.replace(/\.[^.]+$/, "")
  return base.replace(/[^a-z0-9]+/gi, "-").toLowerCase()
}

/** normalize one row (best-effort) */
export function normalizeRow(
  headers: string[],
  row: string[],
  map: Mapping
): { date: string; amount: number; type: "INCOME" | "EXPENSE"; description: string; merchant: string } {
  const idx = (name: string) => headers.findIndex((h) => h === name)

  const get = (col: string) => {
    const i = idx(col)
    return i >= 0 ? (row[i] ?? "").toString().trim() : ""
  }

  // date: keep as ISO-ish string; real parsing will happen server-side later
  const date = get(map.date)

  // amount: handle negative signs, parentheses, commas
  const amtRaw = get(map.amount).replace(/[$,]/g, "")
  let amount = parseFloat(amtRaw.replace(/\((.*)\)/, "-$1"))
  if (Number.isNaN(amount)) amount = 0

  // type: infer if missing or weird
  let t = get(map.type).toUpperCase()
  if (!["INCOME", "EXPENSE"].includes(t)) {
    // heuristics: negative => EXPENSE; positive => INCOME
    t = amount < 0 ? "EXPENSE" : "INCOME"
  }

  const description = get(map.description)
  const merchant = get(map.merchant)

  // If amount is negative but type says INCOME, flip sign and type (rare CSVs)
  if (amount < 0 && t === "INCOME") {
    amount = Math.abs(amount)
    t = "EXPENSE"
  }
  if (amount > 0 && t === "EXPENSE") {
    amount = Math.abs(amount) // keep positive, type drives direction downstream
  }

  return {
    date,
    amount: +amount.toFixed(2),
    type: t as "INCOME" | "EXPENSE",
    description,
    merchant,
  }
}
