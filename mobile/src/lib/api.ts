import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import { getShipmondoConfig } from './shipmondoConfig'
import { getDanadresseKey } from './danadresseConfig'

// Talks to the existing Next.js backend (app.pakogsend.dk) — all business logic (Shipmondo
// integration, pricing, admin auth) stays server-side exactly as it already is; this app is a
// native client for that same API, not a reimplementation of the backend.
export const API_BASE_URL = 'https://app.pakogsend.dk'
const TOKEN_KEY = 'pak-send-admin-token'

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY)
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}

// One thing the server could not accept: which field, and what is wrong with it.
export type FieldProblem = { path: string; problem: 'missing' | 'too_short' | 'invalid' }

export class ApiError extends Error {
  status: number
  code?: string
  fields?: FieldProblem[]
  constructor(message: string, status: number, code?: string, fields?: FieldProblem[]) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

// AuthProvider registers itself here so a 401 from anywhere in the app (a stale token, the
// session's 7-day TTL expiring, AUTH_SECRET rotating) can force a clean sign-out and redirect
// to /login, instead of every screen needing its own "session expired" handling.
let onUnauthorized: (() => void) | null = null
export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

// The active shop location, set by CenterProvider. Sent with every request so the server can count
// bookings for the right location (numbers only, see the Message Center).
let requestLocation: { id: string; name: string } | null = null
export function setRequestLocation(id: string, name: string) {
  requestLocation = { id, name }
}

type ApiResult<T> = { data: T } | { error: { code?: string; message: string; fields?: FieldProblem[] } }

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const [token, shipmondoConfig, danadresseKey] = await Promise.all([getToken(), getShipmondoConfig(), getDanadresseKey()])
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (shipmondoConfig) {
    headers.set('x-shipmondo-api-base-url', shipmondoConfig.baseUrl)
    headers.set('x-shipmondo-api-username', shipmondoConfig.username)
    headers.set('x-shipmondo-api-key', shipmondoConfig.apiKey)
  }
  if (danadresseKey) headers.set('x-danadresse-api-key', danadresseKey)
  if (requestLocation) {
    headers.set('x-location-id', requestLocation.id)
    // Header values must be plain ASCII, and names such as "Borups Allé" are not.
    headers.set('x-location-name', encodeURIComponent(requestLocation.name))
  }
  headers.set('x-app-version', Constants.expoConfig?.version ?? '')

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  const body = (await res.json().catch(() => null)) as ApiResult<T> | null

  if (!res.ok || !body || 'error' in body) {
    const failure = body && 'error' in body ? body.error : null
    if (res.status === 401) {
      await clearToken()
      onUnauthorized?.()
    }
    throw new ApiError(failure?.message ?? `Request failed (${res.status})`, res.status, failure?.code, failure?.fields)
  }
  return body.data
}
