'use client'
import { useEffect, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { isPrinterPaired, isWebBluetoothSupported } from '@/lib/zebraBluetooth'

const CHECK_INTERVAL_MS = 25000

// Shown on every admin page (mounted once in AdminShell) so staff notice a lost printer pairing
// before a customer hits it first at the confirmation screen. This only confirms the browser
// still has permission for the paired device, not that the printer is currently in range and
// powered on — only an actual print attempt confirms that. Silent when everything looks fine.
export function PrinterStatusBanner() {
  const [status, setStatus] = useState<'ok' | 'unpaired' | 'unsupported'>('ok')

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (!isWebBluetoothSupported()) {
        if (!cancelled) setStatus('unsupported')
        return
      }
      const paired = await isPrinterPaired()
      if (!cancelled) setStatus(paired ? 'ok' : 'unpaired')
    }
    check()
    const timer = setInterval(check, CHECK_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  if (status === 'ok') return null

  return (
    <div className="printer-status-banner">
      <TriangleAlert size={18} />
      <span>
        {status === 'unsupported'
          ? "This browser doesn't support Web Bluetooth — printing won't work here. Use a recent version of Chrome."
          : 'No printer paired (or pairing was lost) on this tablet — printing will fail until one is paired again. Check Printers in the sidebar.'}
      </span>
    </div>
  )
}
