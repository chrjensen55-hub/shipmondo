import Link from 'next/link'
import { ArrowUpRight, CalendarDays, CalendarRange, Infinity as AllTime, Package, Wifi } from 'lucide-react'
import { AdminShell, Metric } from '@/components/admin/admin-shell'
import { isShipmondoLive } from '@/lib/shipmondo/status'
import { formatLongDate } from '@/lib/format'
import { getKv } from '@/lib/center/kv'
import { getOverview, type CenterOverview } from '@/lib/center/center'
import { RecentShipments } from './recent-shipments'
export const dynamic = 'force-dynamic'

// The parcel counters of the Message Center, or null while its database isn't connected.
async function loadNumbers(): Promise<CenterOverview | null> {
  const kv = getKv()
  if (!kv) return null
  try {
    return await getOverview(kv)
  } catch {
    return null
  }
}

const shipments = (n: number) => `${n} ${n === 1 ? 'shipment' : 'shipments'}`

export default async function Admin() {
  const totals = (await loadNumbers())?.totals
  const waiting = 'Not counted yet'
  return (
    <AdminShell title="Shipping Dashboard" subtitle={formatLongDate(new Date())} live={isShipmondoLive()}>
      <div className="admin-content">
        <div className="section-label">Parcels sent, all locations</div>
        <div className="metrics">
          <Metric label="Today" value={totals ? String(totals.today.parcels) : '–'} change={totals ? shipments(totals.today.shipments) : waiting} icon={Package} />
          <Metric label="Last 7 days" value={totals ? String(totals.last7.parcels) : '–'} change={totals ? shipments(totals.last7.shipments) : waiting} icon={CalendarDays} />
          <Metric label="Last 30 days" value={totals ? String(totals.last30.parcels) : '–'} change={totals ? shipments(totals.last30.shipments) : waiting} icon={CalendarRange} />
          <Metric label="All time" value={totals ? String(totals.total.parcels) : '–'} change={totals ? shipments(totals.total.shipments) : waiting} icon={AllTime} />
          <Metric label="Locations online" value={totals ? String(totals.online) : '–'} change={totals ? `${totals.connected} connected so far` : waiting} icon={Wifi} />
        </div>
        <p className="mc-muted mc-note">
          {totals ? 'Counted from each booking since the Message Center was set up. ' : 'These numbers start when the Message Center database is connected. '}
          <Link href="/admin/messages">Open the Message Center</Link>
        </p>
        <div className="table-card">
          <header>
            <div>
              <h2>Recent shipments</h2>
              <p>The latest activity across your store</p>
            </div>
            <Link href="/admin/shipments">
              View all <ArrowUpRight />
            </Link>
          </header>
          <RecentShipments />
        </div>
      </div>
    </AdminShell>
  )
}
