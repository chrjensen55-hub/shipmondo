import { getKv } from '@/lib/center/kv'
import { getOverview } from '@/lib/center/center'
import { isEmailConfigured } from '@/lib/center/email'
import { storageFailed } from '@/lib/center/http'
import { getAppVersions } from '@/lib/appVersions'

// Everything the Message Center page shows: locations with online status, app version, unread
// counts and parcel numbers, plus the newest app version for the "new version" message.
export async function GET() {
  const versions = await getAppVersions()
  const latestRelease = versions[0] ? { version: versions[0].version, downloadUrl: versions[0].downloadUrl } : null
  const configured = { storage: false, email: isEmailConfigured() }
  const kv = getKv()
  if (!kv) return Response.json({ data: { configured, overview: null, latestRelease } })
  try {
    return Response.json({ data: { configured: { ...configured, storage: true }, overview: await getOverview(kv), latestRelease } })
  } catch (err) {
    return storageFailed(err)
  }
}
