import { createHmac, timingSafeEqual } from 'crypto'

export const SESSION_COOKIE = 'admin_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

function sign(value: string) {
 return createHmac('sha256', process.env.AUTH_SECRET ?? '').update(value).digest('hex')
}

function safeEqual(a: string, b: string) {
 const bufA = Buffer.from(a)
 const bufB = Buffer.from(b)
 if (bufA.length !== bufB.length) { timingSafeEqual(bufA, bufA); return false }
 return timingSafeEqual(bufA, bufB)
}

export function createSessionToken(): { value: string; expires: Date } {
 const expiresAt = Date.now() + SESSION_TTL_MS
 const payload = `admin.${expiresAt}`
 return { value: `${payload}.${sign(payload)}`, expires: new Date(expiresAt) }
}

export function verifySessionToken(token: string | undefined): boolean {
 if (!token || !process.env.AUTH_SECRET) return false
 const [scope, expiresAtStr, signature] = token.split('.')
 if (scope !== 'admin' || !expiresAtStr || !signature) return false
 if (Date.now() > Number(expiresAtStr)) return false
 return safeEqual(signature, sign(`admin.${expiresAtStr}`))
}

export function checkAdminCredentials(identifier: string, password: string): boolean {
 const username = process.env.ADMIN_USERNAME ?? ''
 const email = process.env.ADMIN_EMAIL ?? ''
 const adminPassword = process.env.ADMIN_PASSWORD ?? ''
 if (!adminPassword || (!username && !email)) return false
 const normalized = identifier.trim().toLowerCase()
 const idMatches = (Boolean(username) && safeEqual(normalized, username.toLowerCase())) || (Boolean(email) && safeEqual(normalized, email.toLowerCase()))
 const passwordMatches = safeEqual(password, adminPassword)
 return idMatches && passwordMatches
}
