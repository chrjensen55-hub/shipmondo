import { fullQuoteRequestSchema } from '@/lib/validation'
import { mockQuotes } from '@/lib/shipping'
import { getLiveQuotes } from '@/lib/shipmondo/quotes'
import { ShipmondoClient } from '@/lib/shipmondo/client'

export async function POST(request: Request) {
  try {
    const input = fullQuoteRequestSchema.parse(await request.json())
    const client = await ShipmondoClient.create()
    // No credentials at all means this tablet was never set up with a Shipmondo account (or its
    // per-tablet override never saved) — surface that clearly right here, at the first step that
    // talks to Shipmondo, instead of quietly quoting mock prices that lead to a booking with no
    // real shipment behind it. SHIPMONDO_MOCK_MODE stays a separate, deliberate override for
    // testing with real credentials already in place.
    if (!client.isConfigured()) {
      return Response.json({ error: { code: 'SHIPMONDO_NOT_CONFIGURED', message: 'Shipmondo is not set up on this tablet. Go to Admin → Settings and add the Shipmondo API credentials for this location.' } }, { status: 503 })
    }
    if (process.env.SHIPMONDO_MOCK_MODE === 'true') {
      return Response.json({ data: mockQuotes(input) })
    }
    try {
      const live = await getLiveQuotes(input)
      // An empty result with working credentials means this destination genuinely isn't served
      // live (not a connection problem), so an estimated mock price is still the right fallback.
      return Response.json({ data: live.length ? live : mockQuotes(input) })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not reach Shipmondo.'
      return Response.json({ error: { code: 'SHIPMONDO_CONNECTION_FAILED', message } }, { status: 502 })
    }
  } catch {
    return Response.json({ error: { code: 'INVALID_REQUEST', message: 'Please check the shipment details.' } }, { status: 400 })
  }
}
