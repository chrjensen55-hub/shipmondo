import { getKv } from '@/lib/center/kv'
import { getThread } from '@/lib/center/center'
import { invalidRequest, locationId, storageFailed } from '@/lib/center/http'

// All messages between head office and one location, oldest first.
export async function GET(request: Request) {
  const parsed = locationId.safeParse(new URL(request.url).searchParams.get('locationId'))
  if (!parsed.success) return invalidRequest()
  const kv = getKv()
  if (!kv) return Response.json({ data: { messages: [], configured: false } })
  try {
    return Response.json({ data: { messages: await getThread(kv, parsed.data), configured: true } })
  } catch (err) {
    return storageFailed(err)
  }
}
