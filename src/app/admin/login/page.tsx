'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminLoginPage(){
 const router = useRouter()
 const [identifier, setIdentifier] = useState('')
 const [password, setPassword] = useState('')
 const [error, setError] = useState('')
 const [loading, setLoading] = useState(false)
 async function submit(e: React.FormEvent){
  e.preventDefault()
  setError('')
  setLoading(true)
  try {
   const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier, password }) })
   if (!res.ok) { const body = await res.json().catch(() => ({})); setError(body.error?.message ?? 'Incorrect username/email or password.'); setLoading(false); return }
   router.push('/admin')
  } catch { setError('Something went wrong. Please try again.'); setLoading(false) }
 }
 return <div className="login-shell"><form className="form-card login-card" onSubmit={submit}>
  <div className="step-heading"><span className="step-kicker">Staff access</span><h1>Admin login</h1><p>Sign in with your username or email.</p></div>
  <label className="field"><span>Username or email</span><input value={identifier} onChange={e=>setIdentifier(e.target.value)} autoFocus/></label>
  <label className="field"><span>Password</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
  {error && <div className="form-error">{error}</div>}
  <button className="button button-primary" disabled={loading} type="submit">{loading ? 'Signing in…' : 'Sign in'}</button>
  <Link className="staff-link" href="/">Back to shipping</Link>
 </form></div>
}
