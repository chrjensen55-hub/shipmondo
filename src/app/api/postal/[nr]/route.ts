// Danish postal code → city lookup. DAWA shut down on 1 Oct 2026; its successor (Danadresse) keeps
// the same paths but requires an API key, so the call is made server-side to keep the key out of
// the native app. Returns 503 until DANADRESSE_API_KEY is configured, and the app then leaves city
// as a normal manual field.
const DANADRESSE_BASE = 'https://api.danadresse.dk'

export async function GET(_request: Request, { params }: { params: Promise<{ nr: string }> }) {
  const { nr } = await params
  if (!/^\d{4}$/.test(nr)) {
    return Response.json({ error: { code: 'INVALID_REQUEST', message: 'Postnummer skal være fire cifre.' } }, { status: 400 })
  }
  const key = process.env.DANADRESSE_API_KEY
  if (!key) {
    return Response.json({ error: { code: 'POSTAL_LOOKUP_NOT_CONFIGURED', message: 'Postnummer-opslag er ikke sat op endnu.' } }, { status: 503 })
  }
  try {
    const res = await fetch(`${DANADRESSE_BASE}/postnumre?nr=${nr}`, { headers: { 'X-Api-Key': key }, cache: 'no-store' })
    if (!res.ok) {
      return Response.json({ error: { code: 'POSTAL_LOOKUP_FAILED', message: 'Kunne ikke finde byen for dette postnummer.' } }, { status: 502 })
    }
    const matches = (await res.json()) as Array<{ nr: string; navn: string }>
    const match = matches.find((p) => p.nr === nr)
    if (!match) {
      return Response.json({ error: { code: 'NOT_FOUND', message: 'Ukendt postnummer.' } }, { status: 404 })
    }
    return Response.json({ data: { postalCode: match.nr, city: match.navn } })
  } catch {
    return Response.json({ error: { code: 'POSTAL_LOOKUP_FAILED', message: 'Kunne ikke finde byen for dette postnummer.' } }, { status: 502 })
  }
}
