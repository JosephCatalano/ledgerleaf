/* eslint-disable no-console */
// prisma/seed.ts
/* eslint-disable no-console */
import { Prisma, $Enums } from "@prisma/client"; // <-- value import, not 'import type'
import { prisma } from "../src/lib/db";

type TransactionType = $Enums.TransactionType;

// You can now construct Decimals:
const dec = (v: string | number) => new Prisma.Decimal(v);


async function main() {
  const demo = await prisma.user.upsert({
    where: { email: "demo@ledgerleaf.app" },
    update: {},
    create: { id: "user_demo", email: "demo@ledgerleaf.app", name: "Demo User" },
  })

  const account = await prisma.account.upsert({
    where: { id: "acct_demo_checking" },
    update: {},
    create: { id: "acct_demo_checking", userId: demo.id, name: "Demo Checking", institution: "Demo Bank", type: "CHECKING", last4: "4242" },
  })

  const income = await prisma.category.upsert({
    where: { id: "cat_income" },
    update: {},
    create: { id: "cat_income", name: "Income", parentId: null },
  })

  const groceries = await prisma.category.upsert({
    where: { id: "cat_groceries" },
    update: {},
    create: { id: "cat_groceries", name: "Groceries", parentId: null },
  })

  const petro = await prisma.merchant.upsert({
    where: { id: "mer_petro" },
    update: {},
    create: { id: "mer_petro", name: "PETRO-CANADA", normalizedName: "petro-canada" },
  })

  const txns: Array<{
    id: string; date: string; amount: Prisma.Decimal; type: TransactionType; description: string;
    merchantId?: string | null; categoryId?: string | null
  }> = [
    { id: "txn_20251001_income", date: "2025-10-01", amount: dec("2500.00"), type: "INCOME", description: "Paycheque", categoryId: income.id },
    { id: "txn_20251003_petro",  date: "2025-10-03", amount: dec("85.73"),   type: "EXPENSE", description: "Fuel - PETRO", merchantId: petro.id },
    { id: "txn_20251005_gro",    date: "2025-10-05", amount: dec("132.18"),  type: "EXPENSE", description: "Walmart groceries", categoryId: groceries.id },
  ]

  for (const t of txns) {
    await prisma.transaction.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id, userId: demo.id, accountId: account.id,
        merchantId: t.merchantId ?? null, categoryId: t.categoryId ?? null,
        date: new Date(t.date), amount: t.amount, type: t.type, description: t.description,
      },
    })
  }

  console.log("Seed complete")
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
