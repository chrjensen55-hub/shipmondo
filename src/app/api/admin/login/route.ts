import { NextResponse } from 'next/server'
import { checkAdminCredentials, createSessionToken, SESSION_COOKIE } from '@/lib/auth'

export async function POST(request: Request) {
 const body = await request.json().catch(() => null)
 const identifier = typeof body?.identifier === 'string' ? body.identifier : ''
 const password = typeof body?.password === 'string' ? body.password : ''
 if (!identifier || !password || !checkAdminCredentials(identifier, password)) {
  return NextResponse.json({ error: { message: 'Incorrect username/email or password.' } }, { status: 401 })
 }
 const { value, expires } = createSessionToken()
 // token is also returned in the body (not just set as a cookie) for the native app, which
 // authenticates via an Authorization header instead of a cookie jar — see proxy.ts.
 const response = NextResponse.json({ data: { ok: true, token: value } })
 response.cookies.set(SESSION_COOKIE, value, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires })
 return response
}
