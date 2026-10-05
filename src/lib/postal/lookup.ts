import postnumre from './da-postnumre.json'

// Official PostNord postal-number file (snapshot 17 Oct 2020, via the dk-postals package) bundled
// with the app. It covers every Danish postal code, so the lookup still works when Danadresse is
// down, rate-limited, or no device key has been entered yet.
const bundled = postnumre as Record<string, string>

const DANADRESSE_BASE = 'https://api.danadresse.dk'

// Each tablet/location sends its own Danadresse key (free plans allow 2,000 lookups per key per
// month). Results are cached per postal code so repeat lookups don't spend quota.
const cache = new Map<string, string>()

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

export async function findDanishCity(nr: string, deviceKey: string | null): Promise<string | null> {
  const cached = cache.get(nr)
  if (cached) return cached

  if (deviceKey) {
    try {
      const city = await danadresseCity(nr, deviceKey)
      if (city) {
        cache.set(nr, city)
        return city
      }
    } catch {
      // Quota used up, key rejected, or Danadresse unreachable: use the bundled data instead.
    }
  }
  return bundledDanishCity(nr)
}
