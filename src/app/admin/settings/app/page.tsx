import { Download, Smartphone } from 'lucide-react'
import { AdminShell } from '@/components/admin/admin-shell'
import { RELEASES_PAGE_URL, getAppVersions } from '@/lib/appVersions'
export const dynamic = 'force-dynamic'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })
}

// Lists every published app version that still exists as a GitHub release (see CLAUDE.md, rule 1).
// The newest one is marked Latest.
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
          <ul className="version-list">
            {versions.map((v, i) => (
              <li key={v.tag}>
                <div>
                  <strong>{v.tag.replace('mobile-v', 'Version ')}</strong>
                  {i === 0 && <span className="badge-latest">Latest Version</span>}
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
