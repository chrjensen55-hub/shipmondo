'use client'
import { useState } from 'react'
import { Printer } from 'lucide-react'
import { printZplViaBluetooth } from '@/lib/zebraBluetooth'

export function ReprintButton({ shipmentId, compact = false }: { shipmentId: number; compact?: boolean }) {
  const [status, setStatus] = useState<'idle' | 'printing' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function reprint() {
    setStatus('printing')
    setMessage('')
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/labels?format=zpl`)
      const body = await res.json()
      if (!res.ok) throw new Error(body.error?.message)
      const label = body.data?.[0]
      if (!label) throw new Error('No label available for this shipment.')
      await printZplViaBluetooth(atob(label.base64))
      setStatus('ok')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error && err.message ? err.message : 'Could not print this label.')
    }
  }

  if (compact) {
    return (
      <div className="reprint reprint-compact">
        <button className="button button-secondary" onClick={reprint} disabled={status === 'printing'} title={status === 'error' ? message : 'Reprint label'}>
          <Printer size={16} /> {status === 'printing' ? '…' : status === 'ok' ? 'Sent' : 'Reprint'}
        </button>
        {status === 'error' && <small className="reprint-compact-error">{message}</small>}
      </div>
    )
  }

  return (
    <div className="reprint">
      <button className="button button-primary" onClick={reprint} disabled={status === 'printing'}>
        <Printer /> {status === 'printing' ? 'Printing…' : 'Reprint label'}
      </button>
      {status === 'ok' && <div className="form-success">Sent to the printer.</div>}
      {status === 'error' && <div className="form-error">{message}</div>}
    </div>
  )
}
