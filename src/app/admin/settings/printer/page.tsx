'use client'
import { useEffect, useState } from 'react'
import { Bluetooth } from 'lucide-react'
import { AdminShell } from '@/components/admin/admin-shell'
import { getAvailablePrinters, getSelectedPrinter, selectPrinter, isBrowserPrintAvailable, type BrowserPrintDevice } from '@/lib/browserPrint'
export const dynamic = 'force-dynamic'

type ListState = { status: 'idle' | 'checking' | 'ready' | 'error'; devices: BrowserPrintDevice[]; message?: string }

export default function PrinterSettings() {
  const [list, setList] = useState<ListState>({ status: 'checking', devices: [] })
  const [selected, setSelected] = useState<BrowserPrintDevice | null>(null)

  async function refresh() {
    setList((s) => ({ ...s, status: 'checking', message: undefined }))
    setSelected(getSelectedPrinter())
    try {
      const reachable = await isBrowserPrintAvailable()
      if (!reachable) throw new Error('Could not reach Zebra Browser Print on this device. Make sure the Browser Print app is installed and running.')
      const devices = await getAvailablePrinters()
      setList({ status: 'ready', devices })
    } catch (err) {
      setList({ status: 'error', devices: [], message: err instanceof Error && err.message ? err.message : 'Could not reach Zebra Browser Print on this device.' })
    }
  }

  function choose(device: BrowserPrintDevice) {
    selectPrinter(device)
    setSelected(device)
  }

  useEffect(() => {
    const timer = setTimeout(refresh, 0)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AdminShell title="Printer settings" subtitle="Connect this tablet to its Zebra label printer" active="Printers" live={selected !== null}>
      <div className="admin-content">
        <section className="setup-card">
          <Bluetooth />
          <h2>{selected ? `Printing to ${selected.name}` : 'No printer selected'}</h2>
          <p>
            Install the &quot;Zebra Browser Print&quot; app from the Play Store on this tablet and pair the printer with it over Bluetooth.
            Then pick the printer below &mdash; this is the one every &quot;Print label&quot; tap uses, and customers are never asked to choose.
          </p>
          {list.status === 'error' && <div className="form-error">{list.message}</div>}
          {selected && <div className="form-success">Selected: {selected.name} ({selected.connection || 'unknown connection'})</div>}
          {list.status === 'ready' && list.devices.length === 0 && <p>Browser Print is running but sees no printers yet &mdash; make sure the printer is paired and powered on, then refresh.</p>}
          {list.devices.length > 0 && (
            <ul className="device-list">
              {list.devices.map((d) => (
                <li key={d.uid} className={selected?.uid === d.uid ? 'selected' : ''}>
                  <span>{d.name || 'Unnamed device'}</span>
                  {selected?.uid === d.uid ? <b>In use for printing</b> : <button className="button button-secondary" onClick={() => choose(d)}>Use this printer</button>}
                </li>
              ))}
            </ul>
          )}
          <button className="button button-primary" onClick={refresh} disabled={list.status === 'checking'}>{list.status === 'checking' ? 'Checking…' : 'Refresh printer list'}</button>
        </section>
      </div>
    </AdminShell>
  )
}
