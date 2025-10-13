import { NextResponse } from "next/server"
import { z } from "zod"
import { parseCsvStrict } from "@/lib/parse-csv"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const UploadSchema = z.object({
  filename: z.string().min(1).refine((n) => n.toLowerCase().endsWith(".csv"), "File must end with .csv"),
  mime: z.string().refine((t) => ["text/csv", "application/vnd.ms-excel", "application/csv"].includes(t), "Not a CSV"),
  size: z.number().max(MAX_SIZE, `CSV must be <= ${MAX_SIZE} bytes`),
})

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    const meta = {
      filename: file.name ?? "",
      mime: file.type ?? "application/octet-stream",
      size: file.size ?? 0,
    }

    const parsedMeta = UploadSchema.safeParse(meta)
    if (!parsedMeta.success) {
      return NextResponse.json({ error: parsedMeta.error.flatten() }, { status: 400 })
    }

    // Read into memory, no disk persistence
    const buf = Buffer.from(await file.arrayBuffer())
    const text = buf.toString("utf8")

    const { headers, rows } = parseCsvStrict(text)
    const sample = rows.slice(0, 5)
    const rowCount = rows.length

    // Drop references for GC (privacy)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _drop = [buf, text]

    return NextResponse.json({ headers, sample, rowCount })
  } catch (err) {
    console.error("upload-csv error:", err)
    return NextResponse.json({ error: "Failed to parse CSV" }, { status: 500 })
  }
}
