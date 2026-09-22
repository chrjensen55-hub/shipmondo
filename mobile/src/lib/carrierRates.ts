// Ported from the web app's src/lib/carrierRates.ts — only the client-side UX defaults (weight
// bracket choices, a reasonable box size per bracket). Actual pricing is computed server-side by
// /api/quotes; this app never prices anything itself.
export type DeliveryLocation = 'home' | 'service_point'
export type BoxSize = { length: number; width: number; height: number }

const DOMESTIC_MAX_WEIGHTS = [{ maxWeight: 1, hasServicePoint: true }, { maxWeight: 5, hasServicePoint: true }, { maxWeight: 10, hasServicePoint: true }, { maxWeight: 20, hasServicePoint: true }, { maxWeight: 35, hasServicePoint: false }]
const INTL_MAX_WEIGHTS = [1, 2, 5, 10, 15, 20]

export function weightBrackets(location: DeliveryLocation): number[] {
  const domestic = DOMESTIC_MAX_WEIGHTS.filter((b) => location !== 'service_point' || b.hasServicePoint).map((b) => b.maxWeight)
  return [...new Set([...domestic, ...INTL_MAX_WEIGHTS])].sort((a, b) => a - b)
}

const BOX_SIZES: (BoxSize & { upTo: number })[] = [
  { upTo: 1, length: 30, width: 20, height: 8 },
  { upTo: 3, length: 35, width: 25, height: 15 },
  { upTo: 5, length: 40, width: 30, height: 20 },
  { upTo: 10, length: 45, width: 35, height: 25 },
  { upTo: 20, length: 50, width: 40, height: 30 },
  { upTo: 35, length: 60, width: 45, height: 35 },
]

export function boxSizeFor(maxWeight: number): BoxSize {
  const match = BOX_SIZES.find((b) => maxWeight <= b.upTo) ?? BOX_SIZES[BOX_SIZES.length - 1]
  return { length: match.length, width: match.width, height: match.height }
}
