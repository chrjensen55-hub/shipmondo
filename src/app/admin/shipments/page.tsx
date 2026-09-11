import { Search, SlidersHorizontal } from 'lucide-react'
import { AdminShell } from '@/components/admin/admin-shell'
import { ShipmentTable } from '../page'
export const dynamic = 'force-dynamic'
export default function Shipments(){return <AdminShell title="Shipments" subtitle="Track and manage every booking" active="Shipments"><div className="admin-content"><div className="toolbar"><label><Search/><input placeholder="Search reference, tracking or customer"/></label><button className="button button-secondary"><SlidersHorizontal/> Filters</button></div><div className="table-card"><ShipmentTable/></div></div></AdminShell>}
