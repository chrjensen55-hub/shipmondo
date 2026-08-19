import { shipmentSchema } from '@/lib/validation'
import { mockQuotes } from '@/lib/shipping'
import { getLiveQuotes } from '@/lib/shipmondo/quotes'
import { createShipment } from '@/lib/shipmondo/shipments'
import { ShipmondoClient } from '@/lib/shipmondo/client'

const completed = new Map<string, { reference: string; tracking: string }>()

export async function POST(request: Request) {
  try {
    const input = shipmentSchema.parse(await request.json())
    const previous = completed.get(input.idempotencyKey)
    if (previous) return Response.json({ data: previous })

    let quote = null
    const client = new ShipmondoClient()
    const live = client.isConfigured() && process.env.SHIPMONDO_MOCK_MODE !== 'true'
    if (live) {
      try {
        quote = (await getLiveQuotes(input)).find((q) => q.id === input.selectedQuoteId) ?? null
      } catch {
        // fall through to mock lookup below
      }
    }
    if (!quote) quote = mockQuotes(input).find((q) => q.id === input.selectedQuoteId) ?? null
    if (!quote) return Response.json({ error: { code: 'QUOTE_EXPIRED', message: 'The selected shipping option is no longer available.' } }, { status: 409 })

    const stamp = Date.now().toString().slice(-7)
    const reference = `PS-${stamp}`

    let result: { reference: string; tracking: string }
    if (live && quote.metadata.source === 'shipmondo') {
      try {
        const booked = await createShipment(input, { productCode: quote.productCode, serviceCodes: quote.serviceCodes, reference })
        result = { reference, tracking: booked.external_pkg_no ?? booked.pkg_no }
      } catch (err) {
        console.error('Shipmondo booking failed', err)
        const message = err instanceof Error ? err.message : 'The carrier rejected this shipment.'
        return Response.json({ error: { code: 'BOOKING_FAILED', message } }, { status: 502 })
      }
    } else {
      result = { reference, tracking: `${quote.carrier.slice(0, 2).toUpperCase()}${stamp}DK` }
    }

    completed.set(input.idempotencyKey, result)
    return Response.json({ data: result }, { status: 201 })
  } catch {
    return Response.json({ error: { code: 'INVALID_REQUEST', message: 'Please check the shipment details.' } }, { status: 400 })
  }
}
