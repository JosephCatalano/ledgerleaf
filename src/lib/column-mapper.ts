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
  date: ["date", "date posted", "transaction date", "posted", "posting date", "value date"],
  amount: ["amount", "transaction amount", "amt", "debit", "credit"],
  type: ["type", "transaction type", "dr/cr", "direction"],
  description: ["description", "details", "narrative", "memo", "reference"],
  merchant: ["merchant", "payee", "name", "counterparty", "description"], // BMO uses description for merchant
}

export function guessMapping(headers: string[]): Omit<Mapping, "bankKey"> {
  const norm = (s: string) => s.toLowerCase().trim()
  const find = (candidates: string[]) =>
    headers.find((h) => {
      const n = norm(h)
      return candidates.some((c) => n.includes(c))
    }) ?? headers[0]

  return {
    date: find(H.date),
    amount: find(H.amount),
    type: find(H.type),
    description: find(H.description),
    merchant: find(H.merchant),
  }
}

export function deriveBankKey(filename: string): string {
  if (!filename) return "unknown"
  const base = filename.replace(/\.[^.]+$/, "")
  return base.replace(/[^a-z0-9]+/gi, "-").toLowerCase()
}

function cleanBMODescription(desc: string): string {
  // Remove BMO's prefix codes like [DN], [PR], [CM]
  return desc.replace(/^\[[A-Z]{2}\]/, '').trim()
}

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

  const date = get(map.date)

  const amtRaw = get(map.amount).replace(/[$,]/g, "")
  let amount = parseFloat(amtRaw.replace(/\((.*)\)/, "-$1"))
  if (Number.isNaN(amount)) amount = 0

  let t = get(map.type).toUpperCase()
  if (!["INCOME", "EXPENSE"].includes(t)) {
    t = amount < 0 ? "EXPENSE" : "INCOME"
  }

  const description = get(map.description)
  const merchant = get(map.merchant)

  // Keep positive magnitude; type conveys direction
  amount = Math.abs(amount)

  // Align sign with type if needed
  if (amount < 0 && t === "INCOME") {
    amount = Math.abs(amount)
    t = "EXPENSE"
  }

  return {
    date,
    amount: +amount.toFixed(2),
    type: t as "INCOME" | "EXPENSE",
    description,
    merchant,
  }
}
