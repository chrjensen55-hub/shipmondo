'use client'
import { useState } from 'react'
import { Printer } from 'lucide-react'
import { getPrinterToUse, printZpl } from '@/lib/browserPrint'

export function ReprintButton({ shipmentId }: { shipmentId: number }) {
  const [status, setStatus] = useState<'idle' | 'printing' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function reprint() {
    setStatus('printing')
    setMessage('')
    try {
      const printer = await getPrinterToUse()
      if (!printer) throw new Error('No printer is set up. Go to Admin → Settings → Printer to select one.')
      const res = await fetch(`/api/shipments/${shipmentId}/labels?format=zpl`)
      const body = await res.json()
      if (!res.ok) throw new Error(body.error?.message)
      const label = body.data?.[0]
      if (!label) throw new Error('No label available for this shipment.')
      await printZpl(printer, atob(label.base64))
      setStatus('ok')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error && err.message ? err.message : 'Could not print this label.')
    }
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
