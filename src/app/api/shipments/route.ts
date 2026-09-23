import { shipmentSchema } from '@/lib/validation'
import { mockQuotes } from '@/lib/shipping'
import { getLiveQuotes } from '@/lib/shipmondo/quotes'
import { createShipment } from '@/lib/shipmondo/shipments'
import { ShipmondoClient } from '@/lib/shipmondo/client'
import type { ShippingQuote } from '@/lib/types'

const completed = new Map<string, { reference: string; tracking: string; shipmentId?: number }>()

export async function POST(request: Request) {
  try {
    const input = shipmentSchema.parse(await request.json())
    const previous = completed.get(input.idempotencyKey)
    if (previous) return Response.json({ data: previous })

    const client = await ShipmondoClient.create()
    // No credentials at all (no per-tablet override, no server env vars) is never a legitimate
    // state to book a real customer's shipment from — it's a setup problem on this tablet, not
    // something to paper over with a fake reference. Fail loudly here instead of falling through
    // to the mock branch below, which used to let staff believe a real shipment was created when
    // nothing was ever sent to Shipmondo at all.
    if (!client.isConfigured()) {
      return Response.json({ error: { code: 'SHIPMONDO_NOT_CONFIGURED', message: 'Shipmondo is not set up on this tablet. Go to Admin → Settings and add the Shipmondo API credentials for this location.' } }, { status: 503 })
    }
    const live = process.env.SHIPMONDO_MOCK_MODE !== 'true'

    // With real credentials configured, the quote lookup and the booking below must both go
    // through Shipmondo for real — never fall back to a mock quote or a fabricated tracking
    // number here. That fallback used to let a booking "succeed" with a fake reference whenever
    // the live lookup hiccupped, and the only sign anything was wrong was a failed print later,
    // with no real shipment behind it to print in the first place.
    let quote: ShippingQuote | null = null
    if (live) {
      try {
        quote = (await getLiveQuotes(input)).find((q) => q.id === input.selectedQuoteId) ?? null
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not reach Shipmondo.'
        return Response.json({ error: { code: 'SHIPMONDO_CONNECTION_FAILED', message } }, { status: 502 })
      }
      if (!quote) return Response.json({ error: { code: 'QUOTE_EXPIRED', message: 'The selected shipping option is no longer available. Go back and get a new rate.' } }, { status: 409 })
    } else {
      quote = mockQuotes(input).find((q) => q.id === input.selectedQuoteId) ?? null
      if (!quote) return Response.json({ error: { code: 'QUOTE_EXPIRED', message: 'The selected shipping option is no longer available.' } }, { status: 409 })
    }

    const stamp = Date.now().toString().slice(-7)
    const reference = `PS-${stamp}`

    let result: { reference: string; tracking: string; shipmentId?: number }
    if (live) {
      try {
        const booked = await createShipment(input, { productCode: quote.productCode, serviceCodes: quote.serviceCodes, reference, requiresCustoms: quote.metadata.requiresCustoms ?? false, ownAgreement: quote.metadata.ownAgreement ?? false })
        result = { reference, tracking: booked.external_pkg_no ?? booked.pkg_no, shipmentId: booked.id }
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
