import { getShipmentLabels } from '@/lib/shipmondo/shipments'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const shipmentId = Number(id)
  if (!Number.isFinite(shipmentId)) {
    return Response.json({ error: { code: 'INVALID_REQUEST', message: 'Invalid shipment id.' } }, { status: 400 })
  }
  const searchParams = new URL(request.url).searchParams
  const format = searchParams.get('format') || undefined
  // The ZD421 is a 203 dpi printhead. Default ZPL requests to Shipmondo's closest supported DPI
  // (200) so labels aren't sized for 300 dpi and run off the edge of the physical label — callers
  // can still override with an explicit ?dpi= if needed.
  const dpiParam = searchParams.get('dpi')
  const dpi = dpiParam ? (Number(dpiParam) as 200 | 300) : format === 'zpl' ? 200 : undefined
  try {
    const labels = await getShipmentLabels(shipmentId, format, dpi)
    return Response.json({ data: labels })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not fetch the shipping label.'
    return Response.json({ error: { code: 'LABEL_FETCH_FAILED', message } }, { status: 502 })
  }
}
