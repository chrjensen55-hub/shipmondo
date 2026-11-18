import { getKv } from '@/lib/center/kv'
import { markThreadRead } from '@/lib/center/center'
import { invalidRequest, readSchema, storageFailed } from '@/lib/center/http'

// Opening a thread clears the unread count for whoever opened it (the location or head office).
export async function POST(request: Request) {
  const parsed = readSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return invalidRequest()
  const kv = getKv()
  if (!kv) return Response.json({ data: { ok: true } })
  try {
    await markThreadRead(kv, parsed.data.locationId, parsed.data.reader)
    return Response.json({ data: { ok: true } })
  } catch (err) {
    return storageFailed(err)
  }
}
