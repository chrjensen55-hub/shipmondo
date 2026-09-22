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
// this app runs on a shop tablet, not as a public self-service site. Excludes the login
// page/action, Next.js/static-asset internals, and the PWA/TWA files below, so nothing
// creates a redirect loop or blocks the framework's own assets.
//
// The PWA/TWA exclusions matter beyond convenience: Android's Digital Asset Links verifier
// fetches /.well-known/assetlinks.json directly, with no browser session and so no login
// cookie — gating it behind auth would silently break the "no address bar" TWA experience
// (Chrome would just show it as a normal, verification-failed browser tab instead). The
// manifest, icons and service worker are fetched the same unauthenticated way during
// install/update checks.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|api/admin/login|api/admin/logout|admin/login|\\.well-known|manifest\\.webmanifest|sw\\.js|icons/).*)',
  ],
}
