import { findDanishCity } from '@/lib/postal/lookup'

// Danish postal code → city for the app's address form. The tablet sends its own Danadresse key in
// a header (entered once in the app's Settings), so each location uses its own lookup quota.
export async function GET(request: Request, { params }: { params: Promise<{ nr: string }> }) {
  const { nr } = await params
  if (!/^\d{4}$/.test(nr)) {
    return Response.json({ error: { code: 'INVALID_REQUEST', message: 'Postnummer skal være fire cifre.' } }, { status: 400 })
  }
  const deviceKey = request.headers.get('x-danadresse-api-key')
  const city = await findDanishCity(nr, deviceKey)
  if (!city) {
    return Response.json({ error: { code: 'NOT_FOUND', message: 'Ukendt postnummer.' } }, { status: 404 })
  }
  return Response.json({ data: { postalCode: nr, city } })
}
