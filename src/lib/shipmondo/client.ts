import 'server-only'
import { ShipmondoApiError } from './types'

export class ShipmondoClient {
  private readonly baseUrl: string
  private readonly username: string
  private readonly key: string

  constructor() {
    this.baseUrl = (process.env.SHIPMONDO_API_BASE_URL ?? '').replace(/\/+$/, '')
    this.username = process.env.SHIPMONDO_API_USERNAME ?? ''
    this.key = process.env.SHIPMONDO_API_KEY ?? ''
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
