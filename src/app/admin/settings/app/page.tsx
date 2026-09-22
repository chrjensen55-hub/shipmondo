import { Download, Smartphone } from 'lucide-react'
import { AdminShell } from '@/components/admin/admin-shell'
export const dynamic = 'force-dynamic'

export default function AppDownloadPage() {
  return (
    <AdminShell title="Android app" subtitle="Install this app directly on the shop tablet" active="Settings">
      <div className="admin-content">
        <section className="setup-card">
          <Smartphone />
          <h2>Pak &amp; Send for Android</h2>
          <p>
            Downloads the installable app (.apk) for this tablet &mdash; opens full-screen with no browser address bar, using its own icon.
            On the tablet, open this page in Chrome and tap the button below; Chrome will ask to allow &quot;install from this source&quot; the first time since it isn&apos;t from the Play Store.
          </p>
          <a className="button button-primary" href="/downloads/pak-and-send.apk" download>
            <Download size={18} /> Download the app
          </a>
        </section>
      </div>
    </AdminShell>
  )
}
