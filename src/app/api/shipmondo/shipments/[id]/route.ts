import { getShipment } from '@/lib/shipmondo/shipments'
import { ShipmondoClient } from '@/lib/shipmondo/client'
import { ShipmondoApiError } from '@/lib/shipmondo/types'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const shipmentId = Number(id)
  if (!Number.isFinite(shipmentId)) {
    return Response.json({ error: { code: 'INVALID_REQUEST', message: 'Invalid shipment id.' } }, { status: 400 })
  }
  const client = await ShipmondoClient.create()
  if (!client.isConfigured()) return Response.json({ error: { code: 'NOT_CONFIGURED', message: 'Add Shipmondo credentials to the server environment.' } }, { status: 503 })
  try {
    const shipment = await getShipment(shipmentId)
    return Response.json({ data: shipment })
  } catch (err) {
    const message = err instanceof ShipmondoApiError ? err.message : 'Could not reach Shipmondo.'
    return Response.json({ error: { code: 'CONNECTION_FAILED', message } }, { status: 502 })
  }
}
