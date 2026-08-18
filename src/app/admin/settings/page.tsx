import Link from 'next/link'
import { Building2, CircleDollarSign, LockKeyhole, Printer, Settings, Truck } from 'lucide-react'
import { AdminShell } from '@/components/admin/admin-shell'
const cards=[['General','Company, currency and defaults',Settings,'#'],['Pricing','Global pricing behaviour',CircleDollarSign,'/admin/pricing'],['Shipmondo','Credentials and connection status',Truck,'#'],['Printer','Label printer and format',Printer,'/admin/settings/printer'],['Store','Pak & Send Frederiksberg',Building2,'#'],['Security','Authentication and staff access',LockKeyhole,'#']] as const
export default function SettingsPage(){return <AdminShell title="Settings" subtitle="Configure your shipping workspace" active="Settings"><div className="admin-content settings-grid">{cards.map(([title,desc,Icon,href])=><Link className="table-card" href={href} key={title}><Icon/><div><b>{title}</b><p>{desc}</p></div><span>→</span></Link>)}</div></AdminShell>}
