import 'server-only'
import { headers } from 'next/headers'
import { ShipmondoApiError } from './types'

// Per-tablet Shipmondo credentials, not just one shared server-wide account: each shop location
// is its own Shipmondo account, set up once on that tablet in the office (native app -> Admin ->
// Shipmondo settings) before it ships out. The native app sends its stored credentials as these
// headers on every request; reading them here (via next/headers, available anywhere in a
// request's server-side call chain) means every existing call site keeps working with only
// `new ShipmondoClient()` -> `await ShipmondoClient.create()`, no credential threading through
// every function signature down the chain. Falls back to the server's own env vars when the
// headers aren't present, which is always true for the web app, so its behavior is unchanged.
const HEADER_BASE_URL = 'x-shipmondo-api-base-url'
const HEADER_USERNAME = 'x-shipmondo-api-username'
const HEADER_KEY = 'x-shipmondo-api-key'

export class ShipmondoClient {
  private readonly baseUrl: string
  private readonly username: string
  private readonly key: string

  private constructor(baseUrl: string, username: string, key: string) {
    this.baseUrl = baseUrl
    this.username = username
    this.key = key
  }

  static async create(): Promise<ShipmondoClient> {
    let overrideBaseUrl: string | null = null
    let overrideUsername: string | null = null
    let overrideKey: string | null = null
    try {
      const h = await headers()
      overrideBaseUrl = h.get(HEADER_BASE_URL)
      overrideUsername = h.get(HEADER_USERNAME)
      overrideKey = h.get(HEADER_KEY)
    } catch {
      // headers() throws outside a request context (e.g. build time) — fall through to env vars.
    }

    const baseUrl = (overrideBaseUrl || process.env.SHIPMONDO_API_BASE_URL || '').replace(/\/+$/, '')
    const username = overrideUsername || process.env.SHIPMONDO_API_USERNAME || ''
    const key = overrideKey || process.env.SHIPMONDO_API_KEY || ''
    return new ShipmondoClient(baseUrl, username, key)
  }

  isConfigured() {
    return Boolean(this.baseUrl && this.username && this.key)
  }

  private authHeader() {
    return `Basic ${Buffer.from(`${this.username}:${this.key}`).toString('base64')}`
  }

  async request<T>(path: string, init?: RequestInit): Promise<T> {
    if (!this.isConfigured()) throw new Error('Shipmondo is not configured')
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: this.authHeader(), ...init?.headers },
      cache: 'no-store',
    })
    const text = await res.text()
    const body = text ? JSON.parse(text) : null
    if (!res.ok) {
      const message = body?.error ?? body?.errors?.join?.(', ') ?? `Shipmondo request failed (${res.status})`
      throw new ShipmondoApiError(res.status, message)
    }
    return body as T
  }

  get<T>(path: string) {
    return this.request<T>(path, { method: 'GET' })
  }

  post<T>(path: string, data: unknown) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(data) })
  }
}
