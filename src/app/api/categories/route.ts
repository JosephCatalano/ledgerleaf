import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error("GET /api/categories error:", error)
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    )
  }
}
