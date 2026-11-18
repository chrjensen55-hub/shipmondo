import { AdminShell } from '@/components/admin/admin-shell'
import { isShipmondoLive } from '@/lib/shipmondo/status'
import { MessageCenter } from './message-center'
export const dynamic = 'force-dynamic'

export default function MessageCenterPage() {
  return (
    <AdminShell title="Message Center" subtitle="Write to the locations, see who is online and how many parcels they send" active="Message Center" live={isShipmondoLive()}>
      <MessageCenter />
    </AdminShell>
  )
}
