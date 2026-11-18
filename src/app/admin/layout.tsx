import { AdminNameProvider } from '@/components/admin/admin-user'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const name = process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL || 'Staff'
  return <AdminNameProvider name={name}>{children}</AdminNameProvider>
}
