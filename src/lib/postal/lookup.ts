import postnumre from './da-postnumre.json'

// Official PostNord postal-number file (snapshot 17 Oct 2020, via the dk-postals package) bundled
// with the app. It covers every Danish postal code, so the city lookup works even when Danadresse
// is down or no API key is configured. Danadresse is preferred whenever it answers.
const bundled = postnumre as Record<string, string>

const DANADRESSE_BASE = 'https://api.danadresse.dk'

export function bundledDanishCity(nr: string): string | null {
  return bundled[nr] ?? null
}

async function danadresseCity(nr: string, key: string): Promise<string | null> {
  const res = await fetch(`${DANADRESSE_BASE}/postnumre?nr=${nr}`, {
    headers: { 'X-Api-Key': key },
    cache: 'no-store',
    signal: AbortSignal.timeout(4000),
  })
  if (!res.ok) throw new Error(`Danadresse responded ${res.status}`)
  const matches = (await res.json()) as Array<{ nr: string; navn: string }>
  return matches.find((p) => p.nr === nr)?.navn ?? null
}

export async function findDanishCity(nr: string): Promise<string | null> {
  const key = process.env.DANADRESSE_API_KEY
  if (key) {
    try {
      const city = await danadresseCity(nr, key)
      if (city) return city
    } catch {
      // Fall through to the bundled data below.
    }
  }
  return bundledDanishCity(nr)
}
