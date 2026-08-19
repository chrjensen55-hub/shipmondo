import 'server-only'
import { ShipmondoClient } from './client'
import type { ShipmondoProduct } from './types'

export async function listProducts(destinationCountryCode: string): Promise<ShipmondoProduct[]> {
  const client = new ShipmondoClient()
  if (!client.isConfigured()) throw new Error('Shipmondo is not configured')
  return client.get<ShipmondoProduct[]>(`/products?country_code=${encodeURIComponent(destinationCountryCode)}`)
}
