// prisma/seed.ts
import { prisma } from "../src/lib/db"

async function main() {
  const demo = await prisma.user.upsert({
    where: { email: "demo@ledgerleaf.app" },
    update: {},
    create: {
      email: "demo@ledgerleaf.app",
      name: "Demo User",
      accounts: {
        create: {
          name: "Demo Checking",
          type: "CHECKING",
          institution: "Demo Bank",
          last4: "4242",
        },
      },
    },
    include: { accounts: true },
  })

  const uncategorized = await prisma.category.upsert({
    where: { id: "uncat-stub" }, // use a fake id to force create once
    update: {},
    create: { id: "uncat-stub", name: "Uncategorized" },
  })

  console.log("Seeded:", { demo: demo.email, account: demo.accounts[0]?.name, uncategorized: uncategorized.name })
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    return prisma.$disconnect().finally(() => process.exit(1))
  })
