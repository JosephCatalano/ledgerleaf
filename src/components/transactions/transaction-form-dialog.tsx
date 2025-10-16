"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { raw } from "@prisma/client/runtime/library"

const transactionSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  merchantId: z.string().optional(),
  categoryId: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  description: z.string().min(1, "Description is required"),
})

type TransactionFormData = z.infer<typeof transactionSchema>

type Transaction = {
  id: string
  accountId: string
  merchantId?: string | null
  categoryId?: string | null
  date: string
  amount: number
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  description: string
}

type TransactionFormDialogProps = {
  open: boolean
  onClose: () => void
  transaction?: Transaction | null
}

async function fetchAccounts() {
  const res = await fetch("/api/accounts")
  if (!res.ok) throw new Error("Failed to fetch accounts")
  return res.json() as Promise<{ accounts: Array<{ id: string; name: string }> }>
}

async function fetchCategories() {
  const res = await fetch("/api/categories")
  if (!res.ok) throw new Error("Failed to fetch categories")
  return res.json() as Promise<{ categories: Array<{ id: string; name: string }> }>
}

async function fetchMerchants() {
  const res = await fetch("/api/merchants")
  if (!res.ok) throw new Error("Failed to fetch merchants")
  return res.json() as Promise<{ merchants: Array<{ id: string; name: string }> }>
}

export function TransactionFormDialog({
  open,
  onClose,
  transaction,
}: TransactionFormDialogProps) {
  const queryClient = useQueryClient()
  const isEditing = !!transaction

  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
    initialData: { accounts: [] }
  })

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    initialData: { categories: [] }
  })

  const { data: merchantsData, isLoading: merchantsLoading } = useQuery({
    queryKey: ["merchants"],
    queryFn: fetchMerchants,
    initialData: { merchants: [] }
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: transaction
      ? {
          accountId: transaction.accountId,
          merchantId: transaction.merchantId ?? undefined,
          categoryId: transaction.categoryId ?? undefined,
          // 🛑 FIX: Check if transaction.date exists (is not null/undefined/empty string) 
          // before trying to process it. Fallback to an empty string if it's invalid.
          date: transaction.date
            ? new Date(transaction.date).toISOString().split("T")[0]
            : "", // Or use new Date().toISOString().split("T")[0] for a current date fallback
          amount: transaction.amount,
          type: transaction.type,
          description: transaction.description,
        }
      : {
          type: "EXPENSE",
          date: new Date().toISOString().split("T")[0],
        },
  })

  const createMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to create transaction")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      reset()
      onClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      const res = await fetch(`/api/transactions/${transaction!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to update transaction")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      onClose()
    },
  })

  const onSubmit = (data: TransactionFormData) => {
    if (isEditing) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Transaction" : "Add New Transaction"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              {...register("type")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
              <option value="TRANSFER">Transfer</option>
            </select>
            {errors.type && (
              <p data-testid="form-error" className="text-sm text-red-600">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...register("date")} />
            {errors.date && (
              <p data-testid="form-error" className="text-sm text-red-600">{errors.date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g., Grocery shopping"
              {...register("description")}
            />
            {errors.description && (
              <p data-testid="form-error" className="text-sm text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("amount")}
            />
            {errors.amount && (
              <p data-testid="form-error" className="text-sm text-red-600">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountId">Account</Label>
            <select
              id="accountId"
              {...register("accountId")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select an account</option>
              {accountsData?.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            {errors.accountId && (
              <p data-testid="form-error" className="text-sm text-red-600">{errors.accountId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Category (optional)</Label>
            <select
              id="categoryId"
              {...register("categoryId")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">No category</option>
              {categoriesData?.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchantId">Merchant (optional)</Label>
            <select
              id="merchantId"
              {...register("merchantId")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">No merchant</option>
              {merchantsData?.merchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>
                  {merchant.name}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Add Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
