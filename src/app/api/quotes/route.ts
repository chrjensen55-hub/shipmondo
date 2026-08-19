import { fullQuoteRequestSchema } from '@/lib/validation'
import { mockQuotes } from '@/lib/shipping'
import { getLiveQuotes } from '@/lib/shipmondo/quotes'
import { ShipmondoClient } from '@/lib/shipmondo/client'

export async function POST(request: Request) {
  try {
    const input = fullQuoteRequestSchema.parse(await request.json())
    const client = new ShipmondoClient()
    if (client.isConfigured() && process.env.SHIPMONDO_MOCK_MODE !== 'true') {
      try {
        const live = await getLiveQuotes(input)
        if (live.length) return Response.json({ data: live })
      } catch {
        // Fall through to mock quotes if the live carrier lookup fails (e.g. unserved destination).
      }
    }
    return Response.json({ data: mockQuotes(input) })
  } catch {
    return Response.json({ error: { code: 'INVALID_REQUEST', message: 'Please check the shipment details.' } }, { status: 400 })
  }
}
