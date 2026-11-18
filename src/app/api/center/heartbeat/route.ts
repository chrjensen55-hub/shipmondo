import { getKv } from '@/lib/center/kv'
import { recordHeartbeat } from '@/lib/center/center'
import { heartbeatSchema, invalidRequest, storageFailed } from '@/lib/center/http'

// A tablet reports in every few minutes: which location it is set to and which app version it
// runs. The answer says how many unread messages from head office are waiting.
export async function POST(request: Request) {
  const parsed = heartbeatSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return invalidRequest()
  const kv = getKv()
  // Without a database the tablets simply have no messages; nothing on the tablet should fail.
  if (!kv) return Response.json({ data: { unread: 0, configured: false } })
  try {
    const { unread } = await recordHeartbeat(kv, parsed.data)
    return Response.json({ data: { unread, configured: true } })
  } catch (err) {
    return storageFailed(err)
  }
}
