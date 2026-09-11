'use client'
import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { AdminShell } from '@/components/admin/admin-shell'
export const dynamic = 'force-dynamic'

type ConnectionState = { status: 'idle' | 'checking' | 'ok' | 'error'; message?: string; accountName?: string }
type PrinterOption = { name: string; hostName: string; printerName: string; labelFormat: string }

export default function PrinterSettings() {
  const [connection, setConnection] = useState<ConnectionState>({ status: 'checking' })
  const [printers, setPrinters] = useState<PrinterOption[]>([])
  const [labelFormat, setLabelFormat] = useState('ZPL')

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
      </div>
    </AdminShell>
  )
}
