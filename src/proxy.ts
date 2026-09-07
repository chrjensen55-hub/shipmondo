import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth'

export function proxy(request: NextRequest) {
 if (request.nextUrl.pathname === '/admin/login') return NextResponse.next()
 if (!verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
  return NextResponse.redirect(new URL('/admin/login', request.url))
 }
 return NextResponse.next()
}

export const config = {
 matcher: ['/admin/:path*'],
}
