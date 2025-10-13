"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mapping, MappingSchema, REQUIRED_FIELDS, deriveBankKey, guessMapping, normalizeRow } from "@/lib/column-mapper"

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

  const bankKey = useMemo(() => deriveBankKey(file?.name || "unknown.csv"), [file?.name])

  // mapping state
  const [mapping, setMapping] = useState<Mapping | null>(null)

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

      if (data.headers?.length) {
        // load preset if exists otherwise guess
        const presetRaw = localStorage.getItem(`preset:${bankKey}`)
        if (presetRaw) {
          const parsed = JSON.parse(presetRaw)
          const candidate = MappingSchema.safeParse(parsed)
          if (candidate.success) {
            setMapping(candidate.data)
          } else {
            setMapping({ bankKey, ...guessMapping(data.headers) })
          }
        } else {
          setMapping({ bankKey, ...guessMapping(data.headers) })
        }
      }
    } finally {
      setLoading(false)
    }
  }

  function updateField(field: keyof Mapping, value: string) {
    setMapping((m) => (m ? { ...m, [field]: value } : m))
  }

  function savePreset() {
    if (!mapping) return
    const safe = MappingSchema.safeParse(mapping)
    if (!safe.success) return alert("Invalid mapping")
    localStorage.setItem(`preset:${mapping.bankKey}`, JSON.stringify(mapping))
    alert(`Preset saved for "${mapping.bankKey}"`)
  }

  function loadPreset() {
    const raw = localStorage.getItem(`preset:${bankKey}`)
    if (!raw) return alert("No preset for this key")
    const parsed = MappingSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return alert("Preset is invalid")
    setMapping(parsed.data)
  }

  const normalizedSample = useMemo(() => {
    if (!res || !mapping) return []
    return res.sample.map((row: string[]) => normalizeRow(res.headers, row, mapping))
  }, [res, mapping])

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="file">CSV File</Label>
              <Input id="file" type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={loading || !file}>
                {loading ? "Parsing…" : "Upload & Preview"}
              </Button>
              <div className="text-sm text-muted-foreground">
                Preset key: <span className="font-medium">{bankKey}</span>
              </div>
            </div>
          </form>

          {res?.error && <p className="text-sm text-red-600">Error: {JSON.stringify(res.error)}</p>}

          {res && !res.error && (
            <div className="space-y-4">
              <div className="text-sm">
                <p className="mb-2">
                  <span className="font-medium">Detected headers:</span> {res.headers.join(" | ")}
                </p>
                <p className="mb-2">
                  <span className="font-medium">Rows:</span> {res.rowCount}
                </p>
              </div>

              {/* Mapper */}
              {mapping && (
                <div className="border rounded-md p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Column Mapper</h3>
                    <div className="flex gap-2">
                      <Button variant="secondary" type="button" onClick={loadPreset}>
                        Load Preset
                      </Button>
                      <Button variant="secondary" type="button" onClick={savePreset}>
                        Save Preset
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {REQUIRED_FIELDS.map((f) => (
                      <div key={f} className="space-y-1">
                        <Label>{f}</Label>
                        <select
                          className="border rounded-md px-2 py-2 text-sm w-full"
                          value={(mapping as any)[f] || ""}
                          onChange={(e) => updateField(f as keyof Mapping, e.target.value)}
                        >
                          {res.headers.map((h: string) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Normalized Preview */}
              {normalizedSample.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">Normalized Preview (first 5 rows)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border text-xs">
                      <thead>
                        <tr>
                          <th className="border px-2 py-1 text-left">date</th>
                          <th className="border px-2 py-1 text-left">amount</th>
                          <th className="border px-2 py-1 text-left">type</th>
                          <th className="border px-2 py-1 text-left">description</th>
                          <th className="border px-2 py-1 text-left">merchant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {normalizedSample.map((r, i) => (
                          <tr key={i}>
                            <td className="border px-2 py-1">{r.date}</td>
                            <td className="border px-2 py-1">{r.amount.toFixed(2)}</td>
                            <td className="border px-2 py-1">{r.type}</td>
                            <td className="border px-2 py-1">{r.description}</td>
                            <td className="border px-2 py-1">{r.merchant}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We’ll insert these server-side in the next lesson (with proper parsing & upserts).
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
