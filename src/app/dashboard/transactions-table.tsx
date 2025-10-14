// src/app/dashboard/TransactionsTable.tsx
"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  PaginationState,
} from "@tanstack/react-table"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Transaction, Merchant, Category, Account } from "@prisma/client"

type Txn = Transaction & {
  merchant: Merchant | null
  category: Category | null
  account: Pick<Account, "id" | "name">
}

type ApiResponse = {
  data: Txn[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type ServerSortBy = "date" | "amount" | "description"
type ServerSortDir = "asc" | "desc"

function mapSorting(sorting: SortingState): { sortBy: ServerSortBy; sortDir: ServerSortDir } {
  const s = sorting[0]
  if (!s) return { sortBy: "date", sortDir: "desc" }
  const col = s.id as ServerSortBy
  const dir = s.desc ? "desc" : "asc"
  return { sortBy: col, sortDir: dir }
}

export default function TransactionsTable() {
  const [q, setQ] = React.useState<string>("")
  const [categoryId, setCategoryId] = React.useState<string>("")
  const [merchantId, setMerchantId] = React.useState<string>("")
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "date", desc: true }])
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 25 })

  const { sortBy, sortDir } = mapSorting(sorting)
  const page = pagination.pageIndex + 1
  const pageSize = pagination.pageSize

  const params = new URLSearchParams()
  params.set("page", String(page))
  params.set("pageSize", String(pageSize))
  params.set("sortBy", sortBy)
  params.set("sortDir", sortDir)
  if (q) params.set("q", q)
  if (categoryId) params.set("categoryId", categoryId)
  if (merchantId) params.set("merchantId", merchantId)

  const { data, isLoading, isError, refetch, isFetching } = useQuery<ApiResponse>({
    queryKey: ["transactions", Object.fromEntries(params)],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch transactions")
      return (await res.json()) as ApiResponse
    },
    keepPreviousData: true,
  })

  const columns = React.useMemo<ColumnDef<Txn>[]>(() => {
    return [
      {
        id: "date",
        accessorKey: "date",
        header: () => <span className="cursor-pointer">Date</span>,
        cell: ({ getValue }) => {
          const d = getValue() as Date | string
          return <span>{format(new Date(d), "yyyy-MM-dd")}</span>
        },
      },
      {
        id: "description",
        accessorKey: "description",
        header: "Description",
      },
      {
        id: "merchant",
        header: "Merchant",
        cell: ({ row }) => <span>{row.original.merchant?.name ?? "—"}</span>,
      },
      {
        id: "category",
        header: "Category",
        cell: ({ row }) => <span>{row.original.category?.name ?? "—"}</span>,
      },
      {
        id: "amount",
        accessorKey: "amount",
        header: () => <span className="cursor-pointer">Amount</span>,
        cell: ({ getValue }) => {
          const val = getValue() as unknown
          // Prisma.Decimal serialized as string
          const n = typeof val === "string" ? Number(val) : Number(val)
          const sign = n < 0 ? "-" : ""
          return <span className={cn(n < 0 ? "text-red-600" : "text-emerald-700")}>{sign}${Math.abs(n).toFixed(2)}</span>
        },
      },
      {
        id: "account",
        header: "Account",
        cell: ({ row }) => <span>{row.original.account.name}</span>,
      },
    ]
  }, [])

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    manualSorting: true,
    manualPagination: true,
    pageCount: data?.totalPages ?? -1,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Transactions</CardTitle>
        <div className="text-sm tabular-nums text-muted-foreground">
          {isFetching ? "Refreshing…" : data ? `${data.total} total` : "—"}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter Bar */}
        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-4">
          <Input
            placeholder="Search description…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            }}
          />
          <Select
            value={categoryId}
            onValueChange={(v) => {
              setCategoryId(v)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            }}
          >
            <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {/* If you have categories in state, map them here. For now keep simple */}
              {/* <SelectItem value="cat_groceries">Groceries</SelectItem> */}
            </SelectContent>
          </Select>
          <Select
            value={merchantId}
            onValueChange={(v) => {
              setMerchantId(v)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            }}
          >
            <SelectTrigger><SelectValue placeholder="All merchants" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => { setQ(""); setCategoryId(""); setMerchantId(""); setSorting([{ id: "date", desc: true }]); setPagination({ pageIndex: 0, pageSize }); }}>
              Reset
            </Button>
            <Button onClick={() => refetch()}>Refresh</Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => {
                    const canSort = ["date", "amount", "description"].includes(h.column.id)
                    return (
                      <TableHead
                        key={h.id}
                        onClick={() => {
                          if (!canSort) return
                          h.column.toggleSorting()
                        }}
                        className={cn(
                          canSort && "cursor-pointer select-none",
                          h.column.getIsSorted() && "underline"
                        )}
                      >
                        {h.isPlaceholder ? null : h.column.columnDef.header as React.ReactNode}
                        {h.column.getIsSorted() === "asc" ? " ↑" : h.column.getIsSorted() === "desc" ? " ↓" : ""}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>Loading…</TableCell>
                </TableRow>
              ) : (data?.data?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>No results</TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((r) => (
                  <TableRow key={r.id}>
                    {r.getVisibleCells().map((c) => (
                      <TableCell key={c.id}>{c.renderCell()}</TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm">
            Page {page} / {data?.totalPages ?? "—"}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => setPagination({ pageIndex: 0, pageSize: Number(v) })}
            >
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={page <= 1}
              onClick={() => setPagination((p) => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))}
              variant="secondary"
            >
              Prev
            </Button>
            <Button
              disabled={!data || page >= (data.totalPages ?? 1)}
              onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}