import { getKv } from '@/lib/center/kv'
import { sendLocationReply } from '@/lib/center/center'
import { invalidRequest, notSetUp, replySchema, storageFailed } from '@/lib/center/http'

// A location answers head office from the tablet app.
export async function POST(request: Request) {
  const parsed = replySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return invalidRequest()
  const kv = getKv()
  if (!kv) return notSetUp()
  try {
    const message = await sendLocationReply(kv, parsed.data.locationId, parsed.data.text)
    return Response.json({ data: { message } }, { status: 201 })
  } catch (err) {
    return storageFailed(err)
  }
}
