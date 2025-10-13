import { parse } from "csv-parse/sync"

export type ParsedCSV = {
  headers: string[]
  rows: string[][]
}

export function parseCsvStrict(text: string): ParsedCSV {
  // Trim BOM if present
  if (text && text.charCodeAt(0) === 0xfeff) text = text.slice(1)

  const records: string[][] = parse(text, {
    bom: true,
    columns: false,        // keep header row separate
    relaxColumnCount: true,
    skipEmptyLines: true,
    trim: true,
  })

  if (records.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = records[0].map(String)
  const rows = records.slice(1).map((r) => r.map(String))
  return { headers, rows }
}
