"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type UploadResult = {
  headers: string[]
  sample: string[][]
  rowCount: number
  error?: any
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [res, setRes] = useState<UploadResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return alert("Choose a CSV first")

    const form = new FormData()
    form.append("file", file)

    setLoading(true)
    setRes(null)
    try {
      const r = await fetch("/api/upload-csv", { method: "POST", body: form })
      const data = await r.json()
      setRes(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Import CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="file">CSV File</Label>
              <Input
                id="file"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button type="submit" disabled={loading || !file}>
              {loading ? "Parsing…" : "Upload & Preview"}
            </Button>
          </form>

          {res?.error && (
            <p className="text-sm text-red-600">Error: {JSON.stringify(res.error)}</p>
          )}

          {res && !res.error && (
            <div className="text-sm">
              <p className="mb-2">
                <span className="font-medium">Detected headers:</span> {res.headers.join(" | ")}
              </p>
              <p className="mb-2">
                <span className="font-medium">Rows:</span> {res.rowCount}
              </p>
              {res.sample.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full border text-xs">
                    <thead>
                      <tr>
                        {res.headers.map((h, i) => (
                          <th key={i} className="border px-2 py-1 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {res.sample.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="border px-2 py-1">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
