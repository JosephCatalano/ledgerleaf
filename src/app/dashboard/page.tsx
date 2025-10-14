import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { TransactionsTable } from "@/components/transactions/transactions-table"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/signin")

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {session.user.name ?? session.user.email}
        </p>
      </div>

      <TransactionsTable />
    </main>
  )
}
