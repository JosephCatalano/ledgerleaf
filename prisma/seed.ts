/* prisma/seed.ts */
import { prisma } from "../src/lib/db"

async function main() {
  // --- Demo user ---
  const demo = await prisma.user.upsert({
    where: { email: "demo@ledgerleaf.app" },
    update: { name: "Demo User" },
    create: {
      email: "demo@ledgerleaf.app",
      name: "Demo User",
    },
  })

  // --- Core categories ---
  const uncategorized = await prisma.category.upsert({
    where: { name: "Uncategorized" },
    update: {},
    create: { name: "Uncategorized" },
  })

  const fuel = await prisma.category.upsert({
    where: { name: "Fuel" },
    update: {},
    create: { name: "Fuel" },
  })

  const groceries = await prisma.category.upsert({
    where: { name: "Groceries" },
    update: {},
    create: { name: "Groceries" },
  })

  // --- Demo account ---
  const account = await prisma.account.upsert({
    where: {
      // per-user unique is not enforced at DB yet, so use a composite finder
      // If you later add a unique([userId,name]) index, you can switch to that.
      id: (
        await prisma.account.findFirst({
          where: { userId: demo.id, name: "Demo Checking" },
          select: { id: true },
        })
      )?.id ?? "___create___",
    },
    update: {},
    create: {
      userId: demo.id,
      name: "Demo Checking",
      type: "OTHER",
    },
  })

  // --- Example merchants (idempotent by unique name) ---
  const petro = await prisma.merchant.upsert({
    where: { name: "PETRO CANADA" },
    update: {},
    create: { name: "PETRO CANADA" },
  })

  const walmart = await prisma.merchant.upsert({
    where: { name: "WALMART" },
    update: {},
    create: { name: "WALMART" },
  })

  // --- A couple of example transactions (skip if already there) ---
  const existing1 = await prisma.transaction.findFirst({
    where: {
      userId: demo.id,
      accountId: account.id,
      description: "Fuel purchase",
      amount: 50.0,
    },
  })
  if (!existing1) {
    await prisma.transaction.create({
      data: {
        userId: demo.id,
        accountId: account.id,
        merchantId: petro.id,
        categoryId: uncategorized.id,
        date: new Date(),
        amount: 50.0,
        type: "EXPENSE",
        description: "Fuel purchase",
      },
    })
  }

  const existing2 = await prisma.transaction.findFirst({
    where: {
      userId: demo.id,
      accountId: account.id,
      description: "Groceries",
      amount: 125.25,
    },
  })
  if (!existing2) {
    await prisma.transaction.create({
      data: {
        userId: demo.id,
        accountId: account.id,
        merchantId: walmart.id,
        categoryId: uncategorized.id,
        date: new Date(),
        amount: 125.25,
        type: "EXPENSE",
        description: "Groceries",
      },
    })
  }

  // --- Example rules (stable IDs so upsert stays idempotent) ---
  await prisma.rule.upsert({
    where: { id: "rule-demo-1" },
    update: {},
    create: {
      id: "rule-demo-1",
      userId: demo.id,
      priority: 10,
      field: "merchant",
      pattern: "PETRO",
      categoryId: fuel.id,
    },
  })

  await prisma.rule.upsert({
    where: { id: "rule-demo-2" },
    update: {},
    create: {
      id: "rule-demo-2",
      userId: demo.id,
      priority: 20,
      field: "description",
      pattern: "regex:/WALMART|COSTCO|NOFRILLS/i",
      categoryId: groceries.id,
    },
  })

  console.log("Seeded:", {
    demo: demo.email,
    account: account.name,
    categories: ["Uncategorized", "Fuel", "Groceries"],
    rules: ["rule-demo-1", "rule-demo-2"],
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
