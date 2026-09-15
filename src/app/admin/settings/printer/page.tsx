'use client'
import { useEffect, useState } from 'react'
import { Printer, Bluetooth } from 'lucide-react'
import { AdminShell } from '@/components/admin/admin-shell'
import { getDefaultPrinter, type BrowserPrintDevice } from '@/lib/browserPrint'
export const dynamic = 'force-dynamic'

type ConnectionState = { status: 'idle' | 'checking' | 'ok' | 'error'; message?: string; accountName?: string }
type PrinterOption = { name: string; hostName: string; printerName: string; labelFormat: string }
type BrowserPrintState = { status: 'idle' | 'checking' | 'ok' | 'error'; device?: BrowserPrintDevice; message?: string }

export default function PrinterSettings() {
  const [connection, setConnection] = useState<ConnectionState>({ status: 'checking' })
  const [printers, setPrinters] = useState<PrinterOption[]>([])
  const [labelFormat, setLabelFormat] = useState('ZPL')
  const [browserPrint, setBrowserPrint] = useState<BrowserPrintState>({ status: 'idle' })

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

  async function checkConnection() {
    try {
      const res = await fetch('/api/shipmondo/test-connection', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error?.message ?? 'Connection failed')
      setConnection({ status: 'ok', accountName: body.data.accountName })
    } catch (err) {
      setConnection({ status: 'error', message: err instanceof Error ? err.message : 'Connection failed' })
    }
  }

  function retryConnection() {
    setConnection({ status: 'checking' })
    checkConnection()
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      checkConnection()
      fetch('/api/shipmondo/printers').then((r) => r.json()).then((body) => setPrinters(body.data ?? [])).catch(() => {})
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  const heading = connection.status === 'ok' ? `Connected to ${connection.accountName}` : connection.status === 'checking' ? 'Checking Shipmondo connection…' : connection.status === 'error' ? 'Connection failed' : 'No printer connected'

  return (
    <AdminShell title="Printer settings" subtitle="Connect Shipmondo Print Client and a label printer" active="Printers" live={connection.status === 'ok'}>
      <div className="admin-content">
        <section className="setup-card">
          <Printer />
          <h2>{heading}</h2>
          <p>{connection.status === 'error' ? connection.message : 'Add Shipmondo server credentials, install Shipmondo Print Client on the store computer, then select the configured Zebra printer here.'}</p>
          <div className="fields two">
            <label className="field">
              <span>Label format</span>
              <select value={labelFormat} onChange={(e) => setLabelFormat(e.target.value)}>
                <option>ZPL</option>
                <option>PDF</option>
              </select>
            </label>
            <label className="field">
              <span>Printer</span>
              <select disabled={printers.length === 0}>
                {printers.length === 0 ? <option>Install Shipmondo Print Client to load printers</option> : printers.map((p) => <option key={p.name}>{p.name} ({p.hostName})</option>)}
              </select>
            </label>
          </div>
          <button className="button button-primary" onClick={retryConnection} disabled={connection.status === 'checking'}>{connection.status === 'checking' ? 'Testing…' : 'Test connection'}</button>
        </section>
        <section className="setup-card">
          <Bluetooth />
          <h2>Zebra Browser Print (this tablet)</h2>
          <p>
            For direct Bluetooth printing on this tablet, install the &quot;Zebra Browser Print&quot; app from the Play Store, pair the ZD421 printer with the tablet over Bluetooth, then open Browser Print and set it as the default printer.
            Once that&apos;s done, tapping &quot;Print label&quot; in the booking wizard sends the label straight to the printer &mdash; no extra setup needed here.
          </p>
          {browserPrint.status === 'ok' && browserPrint.device && (
            <div className="form-success">Connected to {browserPrint.device.name} ({browserPrint.device.connection || 'unknown connection'})</div>
          )}
          {browserPrint.status === 'error' && <div className="form-error">{browserPrint.message}</div>}
          <button className="button button-primary" onClick={testBrowserPrint} disabled={browserPrint.status === 'checking'}>{browserPrint.status === 'checking' ? 'Testing…' : 'Test Zebra Browser Print'}</button>
        </section>
      </div>
    </AdminShell>
  )
}
