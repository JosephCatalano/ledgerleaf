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
  // Find the actual header row for BMO statements (case-insensitive)
  const headerCandidates = ['transaction type', 'date posted', 'transaction amount']
  let headerRowIndex = -1
  for (let i = 0; i < records.length; i++) {
    const row = records[i]
    const joined = row.join(',').toLowerCase()
    const matches = headerCandidates.every((c) => joined.includes(c))
    if (matches) {
      headerRowIndex = i
      break
    }
  }

  if (records.length === 0 || headerRowIndex === -1) {
    // No header found
    return { headers: [], rows: [] }
  }

  // Extract headers: row may already be split into columns or be a single comma-joined cell
  const rawHeaderRow = records[headerRowIndex]
  const headers =
    rawHeaderRow.length > 1
      ? rawHeaderRow.map((h) => String(h).trim())
      : String(rawHeaderRow[0]).split(',').map((h) => h.trim())

  // Build rows after the header. Each record may be already an array of columns or a single string with commas
  const rows: string[][] = []
  for (let i = headerRowIndex + 1; i < records.length; i++) {
    const r = records[i]
    if (!r || r.length === 0) continue
    if (r.length > 1) {
      // already parsed into columns
      rows.push(r.map((c) => String(c).trim()))
    } else if (typeof r[0] === 'string' && r[0].includes(',')) {
      // single cell with comma-separated columns
      rows.push(r[0].split(',').map((c) => c.trim()))
    } else {
      // skip lines that don't look like data rows
      continue
    }
  }

  return { headers, rows }
}
