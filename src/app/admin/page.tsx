import Link from 'next/link'
import { ArrowUpRight, Box, CircleDollarSign, HandCoins, Percent, ReceiptText } from 'lucide-react'
import { AdminShell, Metric } from '@/components/admin/admin-shell'
import { isShipmondoLive } from '@/lib/shipmondo/status'
import { RecentShipments } from './recent-shipments'
export const dynamic = 'force-dynamic'
export default function Admin(){return <AdminShell title="Shipping Dashboard" subtitle="Tuesday, 18 August 2026" live={isShipmondoLive()}><div className="admin-content"><div className="section-label">Today</div><div className="metrics"><Metric label="Shipments" value="12" change="↑ 20% from yesterday" icon={Box}/><Metric label="Revenue" value="4,850 DKK" change="↑ 12.4% from yesterday" icon={CircleDollarSign}/><Metric label="Shipping cost" value="2,920 DKK" change="60.2% of revenue" icon={ReceiptText}/><Metric label="Gross profit" value="1,930 DKK" change="↑ 8.2% from yesterday" icon={HandCoins}/><Metric label="Average margin" value="39.8%" change="Target: 35%" icon={Percent}/></div><div className="table-card"><header><div><h2>Recent shipments</h2><p>The latest activity across your store</p></div><Link href="/admin/shipments">View all <ArrowUpRight/></Link></header><RecentShipments/></div></div></AdminShell>}
