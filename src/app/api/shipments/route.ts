import { parseCustomsItems, parseShipmentRequest } from '@/lib/validation'
import { refuseDetails, refuseRegisteredLetter, serverFault } from '@/lib/refusals'
import { mockQuotes } from '@/lib/shipping'
import { getLiveQuotes } from '@/lib/shipmondo/quotes'
import { createShipment } from '@/lib/shipmondo/shipments'
import { ShipmondoClient } from '@/lib/shipmondo/client'
import type { ShipmentDraft, ShipmentItem, ShippingQuote } from '@/lib/types'
import { after } from 'next/server'
import { getKv } from '@/lib/center/kv'
import { LOCATION_ID_RE, UNKNOWN_LOCATION_ID, WEB_LOCATION_ID, recordShipment } from '@/lib/center/center'

const ROUTE = '/api/shipments'
const completed = new Map<string, { reference: string; tracking: string; shipmentId?: number }>()

// Which location's counters a booking belongs to. Tablets from app version 1.10.0 name their
// location in a header; the website's own wizard signs in with a cookie; anything else is an
// older app version.
function bookingLocation(request: Request): string {
  const header = request.headers.get('x-location-id') ?? ''
  if (LOCATION_ID_RE.test(header)) return header
  return request.headers.get('cookie') ? WEB_LOCATION_ID : UNKNOWN_LOCATION_ID
}

export async function POST(request: Request) {
  try {
    const parsed = parseShipmentRequest(await request.json().catch(() => undefined))
    if (!parsed.ok) return refuseDetails(ROUTE, request, parsed.problems)
    const input = parsed.data
    const previous = completed.get(input.idempotencyKey)
    if (previous) return Response.json({ data: previous })
    if (input.registeredLetter) return refuseRegisteredLetter(ROUTE, request)

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

    // Customs lines only count when this destination needs a customs declaration. For any other
    // parcel they are left out, so lines left over from an earlier try can never stop a booking.
    const requiresCustoms = quote.metadata.requiresCustoms ?? false
    let items: ShipmentItem[] = []
    if (requiresCustoms) {
      const customs = parseCustomsItems(input.items)
      if (!customs.ok) return refuseDetails(ROUTE, request, customs.problems)
      items = customs.data
    }
    const draft: ShipmentDraft = { ...input, items }

    const stamp = Date.now().toString().slice(-7)
    const reference = `PS-${stamp}`

    let result: { reference: string; tracking: string; shipmentId?: number }
    if (live) {
      try {
        const booked = await createShipment(draft, { productCode: quote.productCode, serviceCodes: quote.serviceCodes, reference, requiresCustoms, ownAgreement: quote.metadata.ownAgreement ?? false })
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
    // Numbers for the Message Center (parcels per location and day, carrier used). Runs after the
    // answer is sent and can never fail the booking. Only real bookings are counted.
    // The shipment exists from here on, so nothing below may turn the answer into an error.
    if (live) {
      try {
        const kv = getKv()
        // The carrier as the customer chose it (GLS, PostNord, DAO, Bring), not Shipmondo's longer name.
        const counted = { locationId: bookingLocation(request), carrier: input.carrierName || quote.carrier, parcels: input.parcels.length }
        if (kv) after(() => recordShipment(kv, counted).catch((err) => console.error('Could not count the shipment', err)))
      } catch (err) {
        console.error('Could not count the shipment', err)
      }
    }
    return Response.json({ data: result }, { status: 201 })
  } catch (err) {
    return serverFault(ROUTE, request, err)
  }
}
