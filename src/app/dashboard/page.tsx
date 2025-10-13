// src/app/dashboard/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/signin")
  return <main className="p-6">Welcome, {session.user.name ?? session.user.email}</main>
}
