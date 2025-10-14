"use client"

import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

type Category = { id: string; name: string }
type Merchant = { id: string; name: string }
type Account = { id: string; name: string }

type FiltersProps = {
  categoryId?: string
  merchantId?: string
  accountId?: string
  type?: string
  search?: string
  onFilterChange: (key: string, value: string | undefined) => void
  onClearFilters: () => void
}

async function fetchCategories() {
  const res = await fetch("/api/categories")
  if (!res.ok) throw new Error("Failed to fetch categories")
  return res.json() as Promise<{ categories: Category[] }>
}

async function fetchMerchants() {
  const res = await fetch("/api/merchants")
  if (!res.ok) throw new Error("Failed to fetch merchants")
  return res.json() as Promise<{ merchants: Merchant[] }>
}

async function fetchAccounts() {
  const res = await fetch("/api/accounts")
  if (!res.ok) throw new Error("Failed to fetch accounts")
  return res.json() as Promise<{ accounts: Account[] }>
}

export function TransactionFilters({
  categoryId,
  merchantId,
  accountId,
  type,
  search,
  onFilterChange,
  onClearFilters,
}: FiltersProps) {
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  })

  const { data: merchantsData } = useQuery({
    queryKey: ["merchants"],
    queryFn: fetchMerchants,
  })

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
  })

  const hasActiveFilters =
    categoryId || merchantId || accountId || type || search

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8"
          >
            <X className="h-4 w-4 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            placeholder="Search descriptions..."
            value={search ?? ""}
            onChange={(e) =>
              onFilterChange("search", e.target.value || undefined)
            }
          />
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={categoryId ?? ""}
            onChange={(e) =>
              onFilterChange("categoryId", e.target.value || undefined)
            }
          >
            <option value="">All categories</option>
            <option value="uncategorized">Uncategorized</option>
            {categoriesData?.categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Merchant Filter */}
        <div className="space-y-2">
          <Label htmlFor="merchant">Merchant</Label>
          <select
            id="merchant"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={merchantId ?? ""}
            onChange={(e) =>
              onFilterChange("merchantId", e.target.value || undefined)
            }
          >
            <option value="">All merchants</option>
            {merchantsData?.merchants.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>
                {merchant.name}
              </option>
            ))}
          </select>
        </div>

        {/* Account Filter */}
        <div className="space-y-2">
          <Label htmlFor="account">Account</Label>
          <select
            id="account"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={accountId ?? ""}
            onChange={(e) =>
              onFilterChange("accountId", e.target.value || undefined)
            }
          >
            <option value="">All accounts</option>
            {accountsData?.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={type ?? ""}
            onChange={(e) =>
              onFilterChange("type", e.target.value || undefined)
            }
          >
            <option value="">All types</option>
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
            <option value="TRANSFER">Transfer</option>
          </select>
        </div>
      </div>
    </div>
  )
}
