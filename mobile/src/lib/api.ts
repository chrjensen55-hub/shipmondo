import * as SecureStore from 'expo-secure-store'

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

type ApiResult<T> = { data: T } | { error: { code?: string; message: string } }

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken()
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  const body = (await res.json().catch(() => null)) as ApiResult<T> | null

  if (!res.ok || !body || 'error' in body) {
    const message = body && 'error' in body ? body.error.message : `Request failed (${res.status})`
    throw new ApiError(message, res.status)
  }
  return body.data
}
