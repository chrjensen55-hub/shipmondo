import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth'

export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (verifySessionToken(token)) return NextResponse.next()
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in required.' } }, { status: 401 })
  }
  const loginUrl = new URL('/admin/login', request.url)
  loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
  return NextResponse.redirect(loginUrl)
}

// Gate the entire site (customer wizard included) behind the same staff login —
// this app runs on a shop tablet, not as a public self-service site. Excludes only
// the login page/action themselves and Next.js/static-asset internals, so nothing
// creates a redirect loop or blocks the framework's own assets.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|api/admin/login|api/admin/logout|admin/login).*)'],
}
