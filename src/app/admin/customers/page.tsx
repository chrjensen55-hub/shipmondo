import { AdminShell } from '@/components/admin/admin-shell'
export const dynamic = 'force-dynamic'
const customers=[['Nordic Design ApS','hello@nordicdesign.dk','18','12,840 DKK','Today'],['Anna Jensen','anna@example.dk','5','1,745 DKK','Today'],['Atelier No. 7','studio@atelier7.dk','11','8,290 DKK','Today']]
export default function Customers(){return <AdminShell title="Customers" subtitle="Guest and business shipping history" active="Customers"><div className="admin-content"><div className="table-card"><div className="table-scroll"><table><thead><tr><th>Customer</th><th>Email</th><th>Shipments</th><th>Revenue</th><th>Last shipment</th></tr></thead><tbody>{customers.map(c=><tr key={c[0]}>{c.map(x=><td key={x}>{x}</td>)}</tr>)}</tbody></table></div></div></div></AdminShell>}
