'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { AdminShell, Status } from '@/components/admin/admin-shell'
import type { ShipmondoShipment } from '@/lib/shipmondo/types'
export const dynamic = 'force-dynamic'

type ListState = { status: 'loading' | 'ready' | 'error'; shipments: ShipmondoShipment[]; message?: string }

function recipientName(s: ShipmondoShipment): string {
  const receiver = s.parties.find((p) => p.type === 'receiver')
  return receiver?.name ?? '—'
}

function destination(s: ShipmondoShipment): string {
  const receiver = s.parties.find((p) => p.type === 'receiver')
  return receiver ? `${receiver.city}, ${receiver.country_code}` : '—'
}

export default function Shipments() {
  const [list, setList] = useState<ListState>({ status: 'loading', shipments: [] })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch(`/api/shipmondo/shipments?page=${page}&per_page=25`)
      .then((r) => r.json())
      .then((body) => {
        if (body.error) throw new Error(body.error.message)
        setList({ status: 'ready', shipments: body.data ?? [] })
      })
      .catch((err) => setList({ status: 'error', shipments: [], message: err instanceof Error ? err.message : 'Could not load shipments.' }))
  }, [page])

  function goToPage(next: number) {
    setList((s) => ({ ...s, status: 'loading' }))
    setPage(next)
  }

  const filtered = list.shipments.filter((s) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (s.reference ?? '').toLowerCase().includes(q) || recipientName(s).toLowerCase().includes(q) || (s.pkg_no ?? '').toLowerCase().includes(q) || (s.external_pkg_no ?? '').toLowerCase().includes(q)
  })

  return (
    <AdminShell title="Shipments" subtitle="Every booking made through this app, from Shipmondo's own records" active="Shipments">
      <div className="admin-content">
        <div className="toolbar">
          <label><Search /><input placeholder="Search reference, tracking or recipient" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
        </div>
        <div className="table-card">
          {list.status === 'loading' && <p style={{ padding: 24 }}>Loading shipments…</p>}
          {list.status === 'error' && <p style={{ padding: 24, color: '#a33b2e' }}>{list.message}</p>}
          {list.status === 'ready' && filtered.length === 0 && <p style={{ padding: 24 }}>No shipments found.</p>}
          {list.status === 'ready' && filtered.length > 0 && (
            <div className="table-scroll">
              <table>
                <thead><tr><th>Reference</th><th>Recipient</th><th>Destination</th><th>Carrier</th><th>Price</th><th>Status</th></tr></thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id}>
                      <td><Link href={`/admin/shipments/${s.id}`}>{s.reference || `#${s.id}`}<small>{new Date(s.created_at).toLocaleString()}</small></Link></td>
                      <td>{recipientName(s)}</td>
                      <td>{destination(s)}</td>
                      <td><b>{s.carrier_code}</b><small>{s.description}</small></td>
                      <td>{s.price} DKK</td>
                      <td><Status value="BOOKED" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="toolbar" style={{ marginTop: 18 }}>
          <button className="button button-secondary" onClick={() => goToPage(Math.max(1, page - 1))} disabled={page === 1 || list.status === 'loading'}>Previous</button>
          <span>Page {page}</span>
          <button className="button button-secondary" onClick={() => goToPage(page + 1)} disabled={list.status === 'loading' || list.shipments.length < 25}>Next</button>
        </div>
      </div>
    </AdminShell>
  )
}
