/* eslint-disable no-console */
import { Prisma, type TransactionType } from "@prisma/client"
import { prisma } from "../src/lib/db"

async function main() {
  // --- Demo user ---
  const demo = await prisma.user.upsert({
    where: { email: "demo@ledgerleaf.app" },
    update: {},
    create: {
      id: "user_demo", // stable id for seed
      email: "demo@ledgerleaf.app",
      name: "Demo User",
    },
  })

  // --- Demo checking account (id is the only unique on Account) ---
  const account = await prisma.account.upsert({
    where: { id: "acct_demo_checking" },
    update: {},
    create: {
      id: "acct_demo_checking",
      userId: demo.id,
      name: "Demo Checking",
      institution: "Demo Bank",
      type: "CHECKING",
      last4: "4242",
    },
  })

  // --- Categories (use stable IDs; don't rely on compound unique with null parentId) ---
  const uncategorized = await prisma.category.upsert({
    where: { id: "cat_uncategorized" },
    update: {},
    create: { id: "cat_uncategorized", name: "Uncategorized", parentId: null },
  })

  const income = await prisma.category.upsert({
    where: { id: "cat_income" },
    update: {},
    create: { id: "cat_income", name: "Income", parentId: null },
  })

  const housing = await prisma.category.upsert({
    where: { id: "cat_housing" },
    update: {},
    create: { id: "cat_housing", name: "Housing", parentId: null },
  })

  const groceries = await prisma.category.upsert({
    where: { id: "cat_groceries" },
    update: {},
    create: { id: "cat_groceries", name: "Groceries", parentId: null },
  })

  // Child category needs parentId set
  const rent = await prisma.category.upsert({
    where: { id: "cat_rent" },
    update: {},
    create: { id: "cat_rent", name: "Rent", parentId: housing.id },
  })

  // --- Merchants (name is unique, so we could upsert by name; we’ll use stable IDs for consistency) ---
  const petro = await prisma.merchant.upsert({
    where: { id: "mer_petro" },
    update: {},
    create: { id: "mer_petro", name: "PETRO-CANADA", normalizedName: "petro-canada" },
  })

  const walmart = await prisma.merchant.upsert({
    where: { id: "mer_walmart" },
    update: {},
    create: { id: "mer_walmart", name: "WALMART", normalizedName: "walmart" },
  })

  // --- Helper for money ---
  const dec = (v: string | number) => new Prisma.Decimal(v)

  // --- Sample transactions ---
  const txns: Array<{
    id: string
    date: string
    amount: Prisma.Decimal
    type: TransactionType
    description: string
    merchantId?: string | null
    categoryId?: string | null
  }> = [
    {
      id: "txn_20251001_income",
      date: "2025-10-01",
      amount: dec("2500.00"),
      type: "INCOME",
      description: "Paycheque",
      merchantId: null,
      categoryId: income.id,
    },
    {
      id: "txn_20251003_petro",
      date: "2025-10-03",
      amount: dec("85.73"),
      type: "EXPENSE",
      description: "Fuel - PETRO",
      merchantId: petro.id,
      categoryId: null, // to be categorized by rules later
    },
    {
      id: "txn_20251005_walmart",
      date: "2025-10-05",
      amount: dec("132.18"),
      type: "EXPENSE",
      description: "Walmart groceries",
      merchantId: walmart.id,
      categoryId: groceries.id,
    },
    {
      id: "txn_20251007_rent",
      date: "2025-10-07",
      amount: dec("1200.00"),
      type: "EXPENSE",
      description: "Monthly Rent",
      merchantId: null,
      categoryId: rent.id,
    },
  ]

  for (const t of txns) {
    await prisma.transaction.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        userId: demo.id,
        accountId: account.id,
        merchantId: t.merchantId ?? null,
        categoryId: t.categoryId ?? null,
        date: new Date(t.date),
        amount: t.amount,
        type: t.type,
        description: t.description,
      },
    })
  }

  // --- Starter rule (use stable id) ---
  await prisma.rule.upsert({
    where: { id: "rule_demo_petro" },
    update: {},
    create: {
      id: "rule_demo_petro",
      userId: demo.id,
      priority: 10,
      field: "merchant",
      pattern: "PETRO",
      categoryId: uncategorized.id,
    },
  })

  console.log("Seeded:", {
    demo: demo.email,
    account: account.name,
    categories: ["Uncategorized", "Income", "Housing", "Groceries", "Rent"],
    merchants: ["PETRO-CANADA", "WALMART"],
    transactions: txns.length,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
