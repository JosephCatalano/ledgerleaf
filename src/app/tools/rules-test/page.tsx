"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function RulesTestPage() {
  const [limit, setLimit] = useState("20")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function runTest() {
    setLoading(true)
    setData(null)
    try {
      const r = await fetch("/api/rules/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: Number(limit) || 20 }),
      })
      const j = await r.json()
      setData(j)
      if (!r.ok) alert("Error: " + JSON.stringify(j))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Rule Test Runner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="limit">Recent Transactions</Label>
              <Input id="limit" value={limit} onChange={(e) => setLimit(e.target.value)} className="w-32" />
            </div>
            <Button onClick={runTest} disabled={loading}>{loading ? "Testing…" : "Run"}</Button>
          </div>

          {data && (
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-medium mb-1">Loaded Rules</div>
                <ul className="list-disc ml-5">
                  {(data.rules ?? []).map((r: any) => (
                    <li key={r.id}>
                      <code>#{r.priority}</code> if <b>{r.field}</b> matches <code>{r.pattern}</code> → categoryId:
                      <code>{r.categoryId ?? "none"}</code>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="font-medium mb-1">Results ({data.count})</div>
                <div className="overflow-x-auto">
                  <table className="w-full border">
                    <thead>
                      <tr>
                        <th className="border px-2 py-1 text-left">txId</th>
                        <th className="border px-2 py-1 text-left">categoryId</th>
                        <th className="border px-2 py-1 text-left">matchedRuleId</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.results ?? []).map((r: any) => (
                        <tr key={r.txId}>
                          <td className="border px-2 py-1">{r.txId}</td>
                          <td className="border px-2 py-1">{r.categoryId}</td>
                          <td className="border px-2 py-1">{r.matchedRuleId ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
