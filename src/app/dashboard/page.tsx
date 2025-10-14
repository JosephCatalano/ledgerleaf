import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { TransactionsTable } from "@/components/transactions/transactions-table"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/signin")

  return (
    <div className="space-y-6">
      <TransactionsTable />
    </div>
  )
}
