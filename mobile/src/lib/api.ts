import * as SecureStore from 'expo-secure-store'
import { getShipmondoConfig } from './shipmondoConfig'

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

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

// AuthProvider registers itself here so a 401 from anywhere in the app (a stale token, the
// session's 7-day TTL expiring, AUTH_SECRET rotating) can force a clean sign-out and redirect
// to /login, instead of every screen needing its own "session expired" handling.
let onUnauthorized: (() => void) | null = null
export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

type ApiResult<T> = { data: T } | { error: { code?: string; message: string } }

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const [token, shipmondoConfig] = await Promise.all([getToken(), getShipmondoConfig()])
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (shipmondoConfig) {
    headers.set('x-shipmondo-api-base-url', shipmondoConfig.baseUrl)
    headers.set('x-shipmondo-api-username', shipmondoConfig.username)
    headers.set('x-shipmondo-api-key', shipmondoConfig.apiKey)
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  const body = (await res.json().catch(() => null)) as ApiResult<T> | null

  if (!res.ok || !body || 'error' in body) {
    const message = body && 'error' in body ? body.error.message : `Request failed (${res.status})`
    if (res.status === 401) {
      await clearToken()
      onUnauthorized?.()
    }
    throw new ApiError(message, res.status)
  }
  return body.data
}
