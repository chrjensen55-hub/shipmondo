import { getShipmentLabels } from '@/lib/shipmondo/shipments'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const shipmentId = Number(id)
  if (!Number.isFinite(shipmentId)) {
    return Response.json({ error: { code: 'INVALID_REQUEST', message: 'Invalid shipment id.' } }, { status: 400 })
  }
  const format = new URL(request.url).searchParams.get('format') || undefined
  try {
    const labels = await getShipmentLabels(shipmentId, format)
    return Response.json({ data: labels })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not fetch the shipping label.'
    return Response.json({ error: { code: 'LABEL_FETCH_FAILED', message } }, { status: 502 })
  }
}
