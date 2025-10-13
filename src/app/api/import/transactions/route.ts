import { NextResponse } from "next/server"
import { z } from "zod"
import { parse } from "csv-parse/sync"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MappingSchema = z.object({
  bankKey: z.string().min(1),
  date: z.string().min(1),
  amount: z.string().min(1),
  type: z.string().min(1),
  description: z.string().min(1),
  merchant: z.string().min(1),
})

const ImportFormSchema = z.object({
  accountName: z.string().min(1),
  mapping: MappingSchema,
})

type Mapping = z.infer<typeof MappingSchema>

function parseCsv(text: string): string[][] {
  if (text && text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const rows: string[][] = parse(text, {
    bom: true,
    columns: false,
    relaxColumnCount: true,
    skipEmptyLines: true,
    trim: true,
  })
  return rows
}

function normalizeRow(headers: string[], row: string[], m: Mapping) {
  const idx = (name: string) => headers.findIndex((h) => h === name)
  const get = (col: string) => {
    const i = idx(col)
    return i >= 0 ? (row[i] ?? "").toString().trim() : ""
  }

  const date = get(m.date)

  const raw = get(m.amount).replace(/[$,]/g, "")
  let amount = parseFloat(raw.replace(/\((.*)\)/, "-$1"))
  if (Number.isNaN(amount)) amount = 0

  let kind = get(m.type).toUpperCase()
  if (kind !== "INCOME" && kind !== "EXPENSE") {
    kind = amount < 0 ? "EXPENSE" : "INCOME"
  }

  const description = get(m.description)
  const merchant = get(m.merchant)

  amount = Math.abs(amount)

  return { date, amount, type: kind as "INCOME" | "EXPENSE", description, merchant }
}

async function getOrCreateAccount(userId: string, name: string) {
  const found = await prisma.account.findFirst({ where: { userId, name } })
  if (found) return found
  return prisma.account.create({ data: { userId, name, type: "OTHER" } })
}

async function getOrCreateMerchant(name: string) {
  const n = (name || "").trim() || "Unknown"
  const found = await prisma.merchant.findFirst({ where: { name: n } })
  if (found) return found
  return prisma.merchant.create({ data: { name: n } })
}

async function getUncategorizedCategory() {
  let cat = await prisma.category.findFirst({ where: { name: "Uncategorized" } })
  if (!cat) {
    cat = await prisma.category.create({ data: { name: "Uncategorized" } })
  }
  return cat
}

function makeKey(userId: string, accountId: string, d: string, a: number, desc: string) {
  return `${userId}|${accountId}|${d}|${a.toFixed(2)}|${desc}`.toLowerCase()
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 })

  const form = await req.formData()
  const file = form.get("file")
  const mappingRaw = form.get("mapping")
  const accountName = form.get("accountName")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 })
  }

  let mapping: Mapping
  try {
    const payload = ImportFormSchema.parse({
      accountName: String(accountName || ""),
      mapping: JSON.parse(String(mappingRaw || "{}")),
    })
    mapping = payload.mapping
  } catch {
    return NextResponse.json({ error: "Invalid mapping/accountName" }, { status: 400 })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const text = buf.toString("utf8")
  const rows = parseCsv(text)
  if (rows.length < 2) {
    return NextResponse.json({ error: "CSV has no data rows" }, { status: 400 })
  }
  const headers = rows[0].map(String)
  const dataRows = rows.slice(1)

  const normalized = dataRows.map((r) => normalizeRow(headers, r, mapping))

  const [account, uncategorized] = await Promise.all([
    getOrCreateAccount(user.id, String(accountName)),
    getUncategorizedCategory(),
  ])

  let inserted = 0
  let skippedDuplicate = 0
  const seen = new Set<string>()

  for (const n of normalized) {
    const key = makeKey(user.id, account.id, n.date, n.amount, n.description)
    if (seen.has(key)) {
      skippedDuplicate++
      continue
    }
    seen.add(key)

    const exists = await prisma.transaction.findFirst({
      where: {
        userId: user.id,
        accountId: account.id,
        date: new Date(n.date),
        amount: n.amount,
        description: n.description,
      },
      select: { id: true },
    })
    if (exists) {
      skippedDuplicate++
      continue
    }

    const merchant = await getOrCreateMerchant(n.merchant)

    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        merchantId: merchant.id,
        categoryId: uncategorized.id,
        date: new Date(n.date),
        amount: n.amount, // positive; type carries direction
        type: n.type,
        description: n.description,
      },
    })

    inserted++
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _drop = [buf]

  return NextResponse.json({
    ok: true,
    processed: normalized.length,
    inserted,
    skippedDuplicate,
    account: account.name,
  })
}
