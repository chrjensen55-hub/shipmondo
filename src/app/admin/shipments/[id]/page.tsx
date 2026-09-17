import { AdminShell, Status } from '@/components/admin/admin-shell'
import { getShipment } from '@/lib/shipmondo/shipments'
import type { ShipmondoShipment } from '@/lib/shipmondo/types'
import { ReprintButton } from './reprint-button'
export const dynamic = 'force-dynamic'

async function loadShipment(shipmentId: number): Promise<ShipmondoShipment | null> {
  try {
    return await getShipment(shipmentId)
  } catch {
    return null
  }
}

export default async function Shipment({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const shipmentId = Number(id)
  const s = Number.isFinite(shipmentId) ? await loadShipment(shipmentId) : null

  if (!s) {
    return <AdminShell title="Shipment not found" active="Shipments"><div className="admin-content"><p>Could not load this shipment from Shipmondo.</p></div></AdminShell>
  }

  const sender = s.parties.find((p) => p.type === 'sender')
  const receiver = s.parties.find((p) => p.type === 'receiver')
  return (
    <AdminShell title={s.reference || `#${s.id}`} subtitle={new Date(s.created_at).toLocaleString()} active="Shipments">
      <div className="admin-content detail-grid">
        <section className="table-card detail">
          <header>
            <div><h2>Shipment details</h2><p>{sender?.name} → {receiver?.name}</p></div>
            <Status value="BOOKED" />
          </header>
          <dl>
            <dt>Carrier</dt><dd>{s.carrier_code} {s.description}</dd>
            <dt>Tracking</dt><dd>{s.external_pkg_no || s.pkg_no}</dd>
            <dt>Price</dt><dd>{s.price} DKK</dd>
            <dt>Recipient</dt><dd>{receiver?.name}<br />{receiver?.address1}, {receiver?.postal_code} {receiver?.city}, {receiver?.country_code}</dd>
            <dt>Sender</dt><dd>{sender?.name}<br />{sender?.address1}, {sender?.postal_code} {sender?.city}, {sender?.country_code}</dd>
            {s.customs && <><dt>Customs</dt><dd>{s.customs.goods.map((g) => g.content).join(', ')}</dd></>}
          </dl>
          <ReprintButton shipmentId={s.id} />
        </section>
      </div>
    </AdminShell>
  )
}
