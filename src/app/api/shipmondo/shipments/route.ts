import { listShipments } from '@/lib/shipmondo/shipments'
import { ShipmondoClient } from '@/lib/shipmondo/client'
import { ShipmondoApiError } from '@/lib/shipmondo/types'

export async function GET(request: Request) {
  const client = new ShipmondoClient()
  if (!client.isConfigured()) return Response.json({ error: { code: 'NOT_CONFIGURED', message: 'Add Shipmondo credentials to the server environment.' } }, { status: 503 })
  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get('page') ?? '1')
  const perPage = Number(searchParams.get('per_page') ?? '25')
  try {
    const shipments = await listShipments({ page, perPage })
    return Response.json({ data: shipments })
  } catch (err) {
    const message = err instanceof ShipmondoApiError ? err.message : 'Could not reach Shipmondo.'
    return Response.json({ error: { code: 'CONNECTION_FAILED', message } }, { status: 502 })
  }
}
