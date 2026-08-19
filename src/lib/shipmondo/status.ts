import 'server-only'
import { ShipmondoClient } from './client'

export function isShipmondoLive(): boolean {
  return new ShipmondoClient().isConfigured() && process.env.SHIPMONDO_MOCK_MODE !== 'true'
}
