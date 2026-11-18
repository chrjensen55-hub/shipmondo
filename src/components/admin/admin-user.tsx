'use client'
import { createContext, useContext } from 'react'
import { LogoutButton } from './logout-button'

// The signed-in name is a server setting. Admin pages that render in the browser can't read it,
// so the admin layout hands it down here and every page shows the same name.
const AdminNameContext = createContext('Staff')

export function AdminNameProvider({ name, children }: { name: string; children: React.ReactNode }) {
  return <AdminNameContext.Provider value={name}>{children}</AdminNameContext.Provider>
}

export function AdminUser() {
  const adminName = useContext(AdminNameContext)
  const initials = (adminName.match(/[^\s@.]+/g) ?? []).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || 'S'
  return (
    <div className="admin-user">
      <span>{initials}</span>
      <b>
        {adminName}
        <small>Administrator</small>
      </b>
      <LogoutButton />
    </div>
  )
}
