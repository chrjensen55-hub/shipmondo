import 'server-only'
import { ShipmondoClient } from './client'
import type { ShipmondoProduct } from './types'

// The default list is capped and leaves some products out (e.g. PostNord's PDK_RE "Registered"), so a
// specific product can be requested by its code.
export async function listProducts(destinationCountryCode: string, productCode?: string): Promise<ShipmondoProduct[]> {
  const client = await ShipmondoClient.create()
  if (!client.isConfigured()) throw new Error('Shipmondo is not configured')
  const product = productCode ? `&product_code=${encodeURIComponent(productCode)}` : ''
  return client.get<ShipmondoProduct[]>(`/products?country_code=${encodeURIComponent(destinationCountryCode)}${product}`)
}
