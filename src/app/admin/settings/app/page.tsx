import { Download, Smartphone } from 'lucide-react'
import { AdminShell } from '@/components/admin/admin-shell'
export const dynamic = 'force-dynamic'

// Every published mobile release stays listed here: a new version is ADDED to this page and older
// versions are never removed or replaced (see CLAUDE.md, rule 1). The newest one is marked Latest.
const RELEASES_API_URL = 'https://api.github.com/repos/chrjensen55-hub/shipmondo/releases?per_page=100'
const RELEASES_PAGE_URL = 'https://github.com/chrjensen55-hub/shipmondo/releases'

type GitHubAsset = { name: string; browser_download_url: string; size: number }
type GitHubRelease = { tag_name: string; name: string | null; published_at: string; draft: boolean; prerelease: boolean; assets: GitHubAsset[] }

type AppVersion = { tag: string; title: string; publishedAt: string; downloadUrl: string; sizeBytes: number }

async function getAppVersions(): Promise<AppVersion[]> {
  try {
    const res = await fetch(RELEASES_API_URL, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const releases = (await res.json()) as GitHubRelease[]
    return releases
      .filter((r) => !r.draft && r.tag_name.startsWith('mobile-v'))
      .map((r) => {
        const apk = r.assets.find((a) => a.name.endsWith('.apk'))
        return apk ? { tag: r.tag_name, title: r.name ?? r.tag_name, publishedAt: r.published_at, downloadUrl: apk.browser_download_url, sizeBytes: apk.size } : null
      })
      .filter((v): v is AppVersion => v !== null)
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
  } catch {
    return []
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })
}

export default async function AppDownloadPage() {
  const versions = await getAppVersions()
  const latest = versions[0]

  return (
    <AdminShell title="Android app" subtitle="Install the native app directly on the shop tablet" active="Settings">
      <div className="admin-content">
        <section className="setup-card">
          <Smartphone />
          <h2>Pak &amp; Send for Android</h2>
          <p>
            A genuine native Android app (not a website wrapped in a browser) &mdash; its own UI, direct native Bluetooth printing to the Zebra printer, staff login, the full booking wizard and admin section.
            On the tablet, open this page in Chrome and tap a download below; Chrome will ask to allow &quot;install from this source&quot; the first time since it isn&apos;t from the Play Store.
          </p>
          {latest ? (
            <a className="button button-primary" href={latest.downloadUrl}>
              <Download size={18} /> Download the latest version ({latest.tag.replace('mobile-v', 'v')})
            </a>
          ) : (
            <p className="hs-help">No app versions are available right now.</p>
          )}
        </section>

        <section className="setup-card">
          <h2>All versions</h2>
          <p className="hs-help">Every version stays available. Older versions are kept here in case one is needed again.</p>
          <ul>
            {versions.map((v, i) => (
              <li key={v.tag} className="flex flex-wrap items-center justify-between gap-3 border-b py-3">
                <div>
                  <strong>{v.tag.replace('mobile-v', 'Version ')}</strong>
                  {i === 0 && <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Latest Version</span>}
                  <div className="hs-help">
                    Published {formatDate(v.publishedAt)} &middot; {Math.round(v.sizeBytes / 1024 / 1024)} MB
                  </div>
                </div>
                <a className="button button-secondary" href={v.downloadUrl}>
                  <Download size={16} /> Download
                </a>
              </li>
            ))}
          </ul>
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
