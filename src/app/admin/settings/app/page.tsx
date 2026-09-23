import { Download, Smartphone } from 'lucide-react'
import { AdminShell } from '@/components/admin/admin-shell'
export const dynamic = 'force-dynamic'

const NATIVE_APK_URL = 'https://github.com/chrjensen55-hub/shipmondo/releases/download/mobile-v1.1.0/pak-and-send-native.apk'
const RELEASE_PAGE_URL = 'https://github.com/chrjensen55-hub/shipmondo/releases/tag/mobile-v1.1.0'

export default function AppDownloadPage() {
  return (
    <AdminShell title="Android app" subtitle="Install the native app directly on the shop tablet" active="Settings">
      <div className="admin-content">
        <section className="setup-card">
          <Smartphone />
          <h2>Pak &amp; Send for Android</h2>
          <p>
            A genuine native Android app (not a website wrapped in a browser) &mdash; its own UI, direct native Bluetooth printing to the Zebra printer, staff login, the full booking wizard and admin section.
            On the tablet, open this page in Chrome and tap the button below; Chrome will ask to allow &quot;install from this source&quot; the first time since it isn&apos;t from the Play Store.
          </p>
          <a className="button button-primary" href={NATIVE_APK_URL}>
            <Download size={18} /> Download the app (109 MB)
          </a>
          <p className="hs-help">
            <a href={RELEASE_PAGE_URL} target="_blank" rel="noreferrer">
              View release notes on GitHub
            </a>
          </p>
        </section>
      </div>
    </AdminShell>
  )
}
