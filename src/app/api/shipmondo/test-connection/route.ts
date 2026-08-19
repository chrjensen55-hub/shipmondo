import { ShipmondoClient } from '@/lib/shipmondo/client'
import { getAccount } from '@/lib/shipmondo/account'
import { ShipmondoApiError } from '@/lib/shipmondo/types'

export async function POST() {
  const client = new ShipmondoClient()
  if (!client.isConfigured()) return Response.json({ error: { code: 'NOT_CONFIGURED', message: 'Add Shipmondo credentials to the server environment.' } }, { status: 503 })
  try {
    const account = await getAccount()
    return Response.json({ data: { configured: true, connected: true, accountName: account.name, countryCode: account.country_code } })
  } catch (err) {
    const message = err instanceof ShipmondoApiError ? err.message : 'Could not reach Shipmondo.'
    return Response.json({ error: { code: 'CONNECTION_FAILED', message } }, { status: 502 })
  }
}
