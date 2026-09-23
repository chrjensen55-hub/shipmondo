import { Download, Smartphone } from 'lucide-react'
import { AdminShell } from '@/components/admin/admin-shell'
export const dynamic = 'force-dynamic'

// The /latest/download/ URL always resolves to the newest published release's asset with this
// exact filename - never needs editing here again when a new version ships, as long as future
// releases keep using the same asset name (pak-and-send-native.apk).
const NATIVE_APK_URL = 'https://github.com/chrjensen55-hub/shipmondo/releases/latest/download/pak-and-send-native.apk'
const RELEASES_PAGE_URL = 'https://github.com/chrjensen55-hub/shipmondo/releases'

type ReleaseInfo = { tag: string; publishedAt: string; sizeBytes: number } | null

async function getLatestRelease(): Promise<ReleaseInfo> {
  try {
    const res = await fetch('https://api.github.com/repos/chrjensen55-hub/shipmondo/releases/latest', { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    const asset = data.assets?.find((a: { name: string }) => a.name === 'pak-and-send-native.apk')
    if (!asset) return null
    return { tag: data.tag_name, publishedAt: data.published_at, sizeBytes: asset.size }
  } catch {
    return null
  }
}

export default async function AppDownloadPage() {
  const release = await getLatestRelease()
  const publishedLabel = release
    ? new Date(release.publishedAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })
    : null
  const sizeLabel = release ? `${Math.round(release.sizeBytes / 1024 / 1024)} MB` : null

  return (
    <AdminShell title="Android app" subtitle="Install the native app directly on the shop tablet" active="Settings">
      <div className="admin-content">
        <section className="setup-card">
          <Smartphone />
          <h2>Pak &amp; Send for Android</h2>
          <p>
            A genuine native Android app (not a website wrapped in a browser) &mdash; its own UI, direct native Bluetooth printing to the Zebra printer, staff login, the full booking wizard and admin section.
            On the tablet, open this page in Chrome and tap the button below; Chrome will ask to allow &quot;install from this source&quot; the first time since it isn&apos;t from the Play Store.
            This link always downloads the latest published version.
          </p>
          <a className="button button-primary" href={NATIVE_APK_URL}>
            <Download size={18} /> Download the app{sizeLabel ? ` (${sizeLabel})` : ''}
          </a>
          {release && (
            <p className="hs-help">
              Version {release.tag} &mdash; published {publishedLabel}
            </p>
          )}
          <p className="hs-help">
            <a href={RELEASES_PAGE_URL} target="_blank" rel="noreferrer">
              View all releases on GitHub
            </a>
          </p>
        </section>
      </div>
    </AdminShell>
  )
}
