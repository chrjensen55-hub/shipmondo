'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ShipmondoShipment } from '@/lib/shipmondo/types'
import { ReprintButton } from './shipments/[id]/reprint-button'

type ListState = { status: 'loading' | 'ready' | 'error'; shipments: ShipmondoShipment[]; message?: string }

function recipientName(s: ShipmondoShipment): string {
  return s.parties.find((p) => p.type === 'receiver')?.name ?? '—'
}

function destination(s: ShipmondoShipment): string {
  const receiver = s.parties.find((p) => p.type === 'receiver')
  return receiver ? `${receiver.city}, ${receiver.country_code}` : '—'
}

export function RecentShipments() {
  const [list, setList] = useState<ListState>({ status: 'loading', shipments: [] })

  useEffect(() => {
    fetch('/api/shipmondo/shipments?page=1&per_page=3')
      .then((r) => r.json())
      .then((body) => {
        if (body.error) throw new Error(body.error.message)
        setList({ status: 'ready', shipments: body.data ?? [] })
      })
      .catch((err) => setList({ status: 'error', shipments: [], message: err instanceof Error ? err.message : 'Could not load shipments.' }))
  }, [])

  if (list.status === 'loading') return <p style={{ padding: 24 }}>Loading recent shipments…</p>
  if (list.status === 'error') return <p style={{ padding: 24, color: '#a33b2e' }}>{list.message}</p>
  if (list.shipments.length === 0) return <p style={{ padding: 24 }}>No shipments booked yet.</p>

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><th>Reference</th><th>Recipient</th><th>Destination</th><th>Carrier</th><th>Price</th><th></th></tr></thead>
        <tbody>
          {list.shipments.map((s) => (
            <tr key={s.id}>
              <td><Link href={`/admin/shipments/${s.id}`}>{s.reference || `#${s.id}`}<small>{new Date(s.created_at).toLocaleString()}</small></Link></td>
              <td>{recipientName(s)}</td>
              <td>{destination(s)}</td>
              <td><b>{s.carrier_code}</b><small>{s.description}</small></td>
              <td>{s.price} DKK</td>
              <td><ReprintButton shipmentId={s.id} compact /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
