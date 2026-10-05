import { findDanishCity } from '@/lib/postal/lookup'

// Danish postal code → city for the app's address form, so staff don't type the city for Danish
// addresses. Danadresse answers when it's up and configured; otherwise the bundled PostNord data does.
export async function GET(_request: Request, { params }: { params: Promise<{ nr: string }> }) {
  const { nr } = await params
  if (!/^\d{4}$/.test(nr)) {
    return Response.json({ error: { code: 'INVALID_REQUEST', message: 'Postnummer skal være fire cifre.' } }, { status: 400 })
  }
  const city = await findDanishCity(nr)
  if (!city) {
    return Response.json({ error: { code: 'NOT_FOUND', message: 'Ukendt postnummer.' } }, { status: 404 })
  }
  return Response.json({ data: { postalCode: nr, city } })
}
