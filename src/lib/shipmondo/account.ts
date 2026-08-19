import 'server-only'
import { ShipmondoClient } from './client'
import type { ShipmondoAccount } from './types'

export async function getAccount(): Promise<ShipmondoAccount> {
  const client = new ShipmondoClient()
  if (!client.isConfigured()) throw new Error('Shipmondo is not configured')
  return client.get<ShipmondoAccount>('/account')
}
