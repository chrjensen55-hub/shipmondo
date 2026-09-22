'use client'
import { useEffect, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { isBrowserPrintAvailable } from '@/lib/browserPrint'

const CHECK_INTERVAL_MS = 25000

// Shown on every admin page (mounted once in AdminShell) so staff notice a dead Browser Print
// connection — e.g. after a tablet or printer restart — before a customer hits it first at the
// confirmation screen. Silent when everything's fine; only ever renders the warning state.
export function PrinterStatusBanner() {
  const [reachable, setReachable] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function check() {
      const ok = await isBrowserPrintAvailable()
      if (!cancelled) setReachable(ok)
    }
    check()
    const timer = setInterval(check, CHECK_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  if (reachable) return null

  return (
    <div className="printer-status-banner">
      <TriangleAlert size={18} />
      <span>Can&apos;t reach the Zebra Browser Print app on this tablet — printing will fail until it&apos;s reopened. Check Printers in the sidebar for details.</span>
    </div>
  )
}
