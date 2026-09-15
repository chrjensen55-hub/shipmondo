'use client'
import { useEffect, useState } from 'react'
import { Bluetooth } from 'lucide-react'
import { AdminShell } from '@/components/admin/admin-shell'
import { getDefaultPrinter, type BrowserPrintDevice } from '@/lib/browserPrint'
export const dynamic = 'force-dynamic'

type BrowserPrintState = { status: 'idle' | 'checking' | 'ok' | 'error'; device?: BrowserPrintDevice; message?: string }

export default function PrinterSettings() {
  const [browserPrint, setBrowserPrint] = useState<BrowserPrintState>({ status: 'checking' })

  async function testBrowserPrint() {
    setBrowserPrint({ status: 'checking' })
    try {
      const device = await getDefaultPrinter()
      if (!device) throw new Error('Browser Print is running, but no default printer is set. Open the Browser Print app on this tablet and set the Zebra printer as default.')
      setBrowserPrint({ status: 'ok', device })
    } catch {
      setBrowserPrint({ status: 'error', message: 'Could not reach Zebra Browser Print on this device. Make sure the Browser Print app is installed and running, and the Zebra printer is paired.' })
    }
  }

  useEffect(() => {
    const timer = setTimeout(testBrowserPrint, 0)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AdminShell title="Printer settings" subtitle="Connect this tablet to its Zebra label printer" active="Printers" live={browserPrint.status === 'ok'}>
      <div className="admin-content">
        <section className="setup-card">
          <Bluetooth />
          <h2>{browserPrint.status === 'ok' ? `Connected to ${browserPrint.device?.name}` : browserPrint.status === 'checking' ? 'Checking for a paired printer…' : 'No printer connected'}</h2>
          <p>
            Install the &quot;Zebra Browser Print&quot; app from the Play Store on this tablet, pair the printer with the tablet over Bluetooth, then open Browser Print and set it as the default printer.
            Once that&apos;s done, tapping &quot;Print label&quot; in the booking wizard sends the label straight to the printer automatically &mdash; nothing else to configure here.
          </p>
          {browserPrint.status === 'ok' && browserPrint.device && (
            <div className="form-success">Connected to {browserPrint.device.name} ({browserPrint.device.connection || 'unknown connection'})</div>
          )}
          {browserPrint.status === 'error' && <div className="form-error">{browserPrint.message}</div>}
          <button className="button button-primary" onClick={testBrowserPrint} disabled={browserPrint.status === 'checking'}>{browserPrint.status === 'checking' ? 'Testing…' : 'Test printer'}</button>
        </section>
      </div>
    </AdminShell>
  )
}
