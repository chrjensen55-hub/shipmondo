'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function LoginForm(){
 const router = useRouter()
 const searchParams = useSearchParams()
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
   const next = searchParams.get('next')
   router.push(next && next.startsWith('/') ? next : '/')
  } catch { setError('Something went wrong. Please try again.'); setLoading(false) }
 }
 return <form className="form-card login-card" onSubmit={submit}>
  <div className="step-heading"><span className="step-kicker">Sign in required</span><h1>Pak & Send</h1><p>Enter your username or email and password to continue.</p></div>
  <label className="field"><span>Username or email</span><input value={identifier} onChange={e=>setIdentifier(e.target.value)} autoFocus/></label>
  <label className="field"><span>Password</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
  {error && <div className="form-error">{error}</div>}
  <button className="button button-primary" disabled={loading} type="submit">{loading ? 'Signing in…' : 'Sign in'}</button>
 </form>
}
