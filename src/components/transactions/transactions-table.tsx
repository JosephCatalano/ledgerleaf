"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react"
import { TransactionFilters } from "./transaction-filters"

type Transaction = {
  id: string
  date: string
  description: string
  amount: number
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  category: { id: string; name: string } | null
  merchant: { id: string; name: string } | null
  account: { id: string; name: string }
}

type TransactionsResponse = {
  transactions: Transaction[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
}

type FilterState = {
  categoryId?: string
  merchantId?: string
  accountId?: string
  type?: string
  search?: string
}

async function fetchTransactions(
  page: number,
  pageSize: number,
  sortBy: string,
  sortOrder: string,
  filters: FilterState
): Promise<TransactionsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    sortBy,
    sortOrder,
    ...Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined)
    ),
  })

  const res = await fetch(`/api/transactions?${params}`)
  if (!res.ok) throw new Error("Failed to fetch transactions")
  return res.json()
}

const columnHelper = createColumnHelper<Transaction>()

export function TransactionsTable() {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ])
  const [filters, setFilters] = useState<FilterState>({})

  const sortBy = sorting[0]?.id ?? "date"
  const sortOrder = sorting[0]?.desc ? "desc" : "asc"

  const { data, isLoading, error } = useQuery({
    queryKey: ["transactions", page, pageSize, sortBy, sortOrder, filters],
    queryFn: () => fetchTransactions(page, pageSize, sortBy, sortOrder, filters),
  })

  const handleFilterChange = (key: string, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1) // Reset to first page when filter changes
  }

  const handleClearFilters = () => {
    setFilters({})
    setPage(1)
  }

  const columns: ColumnDef<Transaction, unknown>[] = [
    columnHelper.accessor("date", {
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            setSorting([{ id: "date", desc: !column.getIsSorted() || column.getIsSorted() === "asc" }])
          }
          className="-ml-3 h-8"
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: (info) => new Date(info.getValue() as string).toLocaleDateString(),
    }),
    columnHelper.accessor("description", {
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            setSorting([{ id: "description", desc: !column.getIsSorted() || column.getIsSorted() === "asc" }])
          }
          className="-ml-3 h-8"
        >
          Description
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: (info) => <div className="max-w-xs truncate">{info.getValue()}</div>,
    }),
    columnHelper.accessor("merchant", {
      header: "Merchant",
      cell: (info) => {
        const merchant = info.getValue()
        return merchant ? (
          <span>{merchant.name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    }),
    columnHelper.accessor("category", {
      header: "Category",
      cell: (info) => {
        const category = info.getValue()
        return category ? (
          <Badge variant="secondary">{category.name}</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Uncategorized
          </Badge>
        )
      },
    }),
    columnHelper.accessor("account", {
      header: "Account",
      cell: (info) => (
        <span className="text-muted-foreground text-xs">{info.getValue().name}</span>
      ),
    }),
    columnHelper.accessor("amount", {
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            setSorting([{ id: "amount", desc: !column.getIsSorted() || column.getIsSorted() === "asc" }])
          }
          className="-ml-3 h-8"
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: (info) => {
        const amount = info.getValue() as number
        const type = info.row.original.type
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(Math.abs(amount))

        return (
          <div
            className={`text-right font-medium ${
              type === "EXPENSE"
                ? "text-red-600"
                : type === "INCOME"
                  ? "text-green-600"
                  : "text-blue-600"
            }`}
          >
            {type === "EXPENSE" ? "-" : type === "INCOME" ? "+" : ""}
            {formatted}
          </div>
        )
      },
    }),
    columnHelper.accessor("type", {
      header: "Type",
      cell: (info) => {
        const type = info.getValue()
        return (
          <Badge
            variant={
              type === "EXPENSE"
                ? "destructive"
                : type === "INCOME"
                  ? "default"
                  : "outline"
            }
          >
            {type}
          </Badge>
        )
      },
    }),
  ]

  const table = useReactTable({
    data: data?.transactions ?? [],
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">
            Loading transactions...
          </span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-red-600">
            <p className="font-medium">Error loading transactions</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <TransactionFilters
            categoryId={filters.categoryId}
            merchantId={filters.merchantId}
            accountId={filters.accountId}
            type={filters.type}
            search={filters.search}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
          />
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Transactions ({data?.pagination.totalCount ?? 0})
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Page {data?.pagination.page} of {data?.pagination.totalPages}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!data?.transactions.length ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="font-medium">No transactions found</p>
              <p className="text-sm mt-1">
                Try adjusting your filters or import some transactions
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="border-b">
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="text-left py-3 px-4 font-medium text-sm"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="border-b hover:bg-muted/50">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="py-3 px-4 text-sm">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {((page - 1) * pageSize) + 1} to{" "}
                  {Math.min(page * pageSize, data.pagination.totalCount)} of{" "}
                  {data.pagination.totalCount} transactions
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= (data.pagination.totalPages ?? 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
