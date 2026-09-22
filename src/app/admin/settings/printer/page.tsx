'use client'
import { useEffect, useState } from 'react'
import { Bluetooth } from 'lucide-react'
import { AdminShell } from '@/components/admin/admin-shell'
import { clearPairedPrinter, getPairedPrinter, isWebBluetoothSupported, pairPrinter, type PairedPrinter } from '@/lib/zebraBluetooth'
export const dynamic = 'force-dynamic'

type PairState = { status: 'idle' | 'pairing' | 'error'; message?: string }

export default function PrinterSettings() {
  const [paired, setPaired] = useState<PairedPrinter | null>(null)
  const [supported, setSupported] = useState(true)
  const [state, setState] = useState<PairState>({ status: 'idle' })

  useEffect(() => {
    const timer = setTimeout(() => {
      setPaired(getPairedPrinter())
      setSupported(isWebBluetoothSupported())
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  async function pair() {
    setState({ status: 'pairing' })
    try {
      const device = await pairPrinter()
      setPaired(device)
      setState({ status: 'idle' })
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error && err.message ? err.message : 'Could not pair with a printer.' })
    }
  }

  function unpair() {
    clearPairedPrinter()
    setPaired(null)
  }

  return (
    <AdminShell title="Printer settings" subtitle="Connect this tablet directly to its Zebra label printer over Bluetooth" active="Printers" live={paired !== null}>
      <div className="admin-content">
        <section className="setup-card">
          <Bluetooth />
          <h2>{paired ? `Paired with ${paired.name}` : 'No printer paired'}</h2>
          <p>
            Printing talks to the Zebra printer directly over Bluetooth from this page &mdash; no separate app needed on the tablet.
            Pairing is a one-time step per tablet; every &quot;Print label&quot; tap afterwards reconnects automatically, and customers are never asked to choose a printer.
          </p>
          {!supported && <div className="form-error">This browser doesn&apos;t support Web Bluetooth, so direct printing isn&apos;t available here. Use a recent version of Chrome.</div>}
          {state.status === 'error' && <div className="form-error">{state.message}</div>}
          {paired && <div className="form-success">Paired: {paired.name}</div>}
          <div className="printer-pair-actions">
            <button className="button button-primary" onClick={pair} disabled={!supported || state.status === 'pairing'}>
              <Bluetooth size={18} /> {state.status === 'pairing' ? 'Waiting for device picker…' : paired ? 'Pair a different printer' : 'Pair printer via Bluetooth'}
            </button>
            {paired && <button className="button button-secondary" onClick={unpair}>Forget this printer</button>}
          </div>
        </section>
      </div>
    </AdminShell>
  )
}
