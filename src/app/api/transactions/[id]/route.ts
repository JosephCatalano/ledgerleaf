// src/app/api/transactions/[id]/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

export const dynamic = "force-dynamic"

const UpdateTransactionSchema = z.object({
  accountId: z.string().optional(),
  merchantId: z.string().optional(),
  categoryId: z.string().optional(),
  date: z.string().optional(),
  amount: z.number().optional(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).optional(),
  description: z.string().optional(),
})

// PUT /api/transactions/[id] - Update a transaction
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { id } = await params
    const body = await req.json()

    const validation = UpdateTransactionSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Check if transaction exists and belongs to user
    const existingTransaction = await prisma.transaction.findFirst({
      where: { id, userId },
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: "Transaction not found or doesn't belong to user" },
        { status: 404 }
      )
    }

    const data = validation.data

    // If accountId is being changed, verify it belongs to user
    if (data.accountId) {
      const account = await prisma.account.findFirst({
        where: { id: data.accountId, userId },
      })

      if (!account) {
        return NextResponse.json(
          { error: "Account not found or doesn't belong to user" },
          { status: 404 }
        )
      }
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...(data.accountId && { accountId: data.accountId }),
        ...(data.merchantId !== undefined && { merchantId: data.merchantId }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.date && { date: new Date(data.date) }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.type && { type: data.type }),
        ...(data.description && { description: data.description }),
      },
      include: {
        category: true,
        merchant: true,
        account: true,
      },
    })

    return NextResponse.json({ transaction })
  } catch (error) {
    console.error("PUT /api/transactions/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    )
  }
}

// DELETE /api/transactions/[id] - Delete a transaction
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { id } = await params

    // Check if transaction exists and belongs to user
    const existingTransaction = await prisma.transaction.findFirst({
      where: { id, userId },
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: "Transaction not found or doesn't belong to user" },
        { status: 404 }
      )
    }

    await prisma.transaction.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/transactions/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    )
  }
}