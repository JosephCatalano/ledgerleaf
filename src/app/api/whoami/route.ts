import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const s = await getServerSession(authOptions)
  return Response.json({ user: s?.user ?? null })
}
