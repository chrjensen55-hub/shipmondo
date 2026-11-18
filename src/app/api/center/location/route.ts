import { getKv } from '@/lib/center/kv'
import { setLocationEmail } from '@/lib/center/center'
import { invalidRequest, locationEmailSchema, notSetUp, storageFailed } from '@/lib/center/http'

// Saves the e-mail address a location's messages are also sent to. An empty address removes it.
export async function POST(request: Request) {
  const parsed = locationEmailSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return invalidRequest()
  const kv = getKv()
  if (!kv) return notSetUp()
  try {
    await setLocationEmail(kv, parsed.data.locationId, parsed.data.email)
    return Response.json({ data: { ok: true } })
  } catch (err) {
    return storageFailed(err)
  }
}
