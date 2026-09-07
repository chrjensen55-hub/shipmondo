'use client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export function LogoutButton(){
 const router = useRouter()
 async function logout(){ await fetch('/api/admin/logout', { method: 'POST' }); router.push('/') }
 return <button className="logout-button" onClick={logout} title="Log out"><LogOut/></button>
}
