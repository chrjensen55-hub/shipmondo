import { fullQuoteRequestSchema } from '@/lib/validation'
import { mockQuotes } from '@/lib/shipping'
import { getLiveQuotes } from '@/lib/shipmondo/quotes'
import { ShipmondoClient } from '@/lib/shipmondo/client'

export async function POST(request: Request) {
  try {
    const input = fullQuoteRequestSchema.parse(await request.json())
    const client = await ShipmondoClient.create()
    // Mock quotes are only a legitimate fallback when Shipmondo isn't configured at all (local
    // dev, or SHIPMONDO_MOCK_MODE explicitly on). Once real credentials are present, a failure
    // here (bad key, wrong base URL, network issue) must surface as an error — silently
    // substituting mock prices let staff book a shipment that was never actually created with
    // Shipmondo, which only failed later when they tried to print a label that didn't exist.
    if (!client.isConfigured() || process.env.SHIPMONDO_MOCK_MODE === 'true') {
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
