export type DeliveryLocation = 'home' | 'service_point'
export type RateBracket = { maxWeight: number; price: number }
export type BoxSize = { length: number; width: number; height: number }

// Real carrier cost rates (DKK, excl. VAT), keyed by carrier name and delivery location.
// `maxWeight` is the upper bound (kg) of that weight class; brackets are ascending and
// non-overlapping, matching each carrier's own published weight classes.
export const CARRIER_RATE_CARDS: Record<string, Partial<Record<DeliveryLocation, RateBracket[]>>> = {
  DAO: {
    service_point: [
      { maxWeight: 0.25, price: 34.8 },
      { maxWeight: 0.5, price: 36.6 },
      { maxWeight: 1, price: 38.43 },
      { maxWeight: 2, price: 42.51 },
      { maxWeight: 3, price: 44.55 },
      { maxWeight: 5, price: 46.59 },
      { maxWeight: 10, price: 54.96 },
      { maxWeight: 15, price: 64.55 },
    ],
    home: [
      { maxWeight: 0.25, price: 39.66 },
      { maxWeight: 0.5, price: 41.29 },
      { maxWeight: 1, price: 42.51 },
      { maxWeight: 2, price: 46.59 },
      { maxWeight: 3, price: 49.45 },
      { maxWeight: 5, price: 52.51 },
    ],
  },
  GLS: {
    service_point: [
      { maxWeight: 1, price: 34.8 },
      { maxWeight: 5, price: 39.8 },
      { maxWeight: 10, price: 58.4 },
      { maxWeight: 15, price: 74.0 },
      { maxWeight: 20, price: 96.0 },
    ],
    home: [
      { maxWeight: 1, price: 59.8 },
      { maxWeight: 5, price: 67.8 },
      { maxWeight: 10, price: 76.4 },
      { maxWeight: 15, price: 95.8 },
      { maxWeight: 20, price: 119.8 },
    ],
  },
  PostNord: {
    service_point: [
      { maxWeight: 1, price: 37.8 },
      { maxWeight: 2, price: 48.2 },
      { maxWeight: 5, price: 58.4 },
      { maxWeight: 10, price: 62.8 },
      { maxWeight: 15, price: 73.8 },
      { maxWeight: 20, price: 94.4 },
    ],
    home: [
      { maxWeight: 1, price: 57.8 },
      { maxWeight: 2, price: 66.4 },
      { maxWeight: 5, price: 69.8 },
      { maxWeight: 10, price: 76.4 },
      { maxWeight: 15, price: 86.8 },
      { maxWeight: 20, price: 103.0 },
    ],
  },
  Bring: {
    service_point: [
      { maxWeight: 1, price: 40.0 },
      { maxWeight: 5, price: 49.0 },
      { maxWeight: 10, price: 61.0 },
      { maxWeight: 15, price: 67.0 },
      { maxWeight: 20, price: 78.0 },
      { maxWeight: 25, price: 81.0 },
      { maxWeight: 30, price: 89.0 },
    ],
    home: [
      { maxWeight: 1, price: 115.0 },
      { maxWeight: 5, price: 119.0 },
      { maxWeight: 10, price: 122.0 },
      { maxWeight: 15, price: 126.0 },
      { maxWeight: 20, price: 130.0 },
      { maxWeight: 25, price: 134.0 },
      { maxWeight: 30, price: 138.0 },
    ],
  },
}

export function ratesFor(carrierName: string, location: DeliveryLocation): RateBracket[] {
  return CARRIER_RATE_CARDS[carrierName]?.[location] ?? []
}

export function availableLocations(carrierName: string): DeliveryLocation[] {
  const card = CARRIER_RATE_CARDS[carrierName]
  if (!card) return ['home', 'service_point']
  return (['service_point', 'home'] as const).filter((loc) => card[loc])
}

export function maxWeightFor(carrierName: string, location: DeliveryLocation): number | undefined {
  const brackets = ratesFor(carrierName, location)
  return brackets.length ? brackets[brackets.length - 1].maxWeight : undefined
}

/** Real carrier price (DKK excl. VAT) for a given actual weight, or undefined if it exceeds the carrier's max. */
export function rateForWeight(carrierName: string, location: DeliveryLocation, weightKg: number): number | undefined {
  return ratesFor(carrierName, location).find((b) => weightKg <= b.maxWeight)?.price
}

const BOX_SIZES: (BoxSize & { upTo: number })[] = [
  { upTo: 1, length: 30, width: 20, height: 8 },
  { upTo: 3, length: 35, width: 25, height: 15 },
  { upTo: 5, length: 40, width: 30, height: 20 },
  { upTo: 10, length: 45, width: 35, height: 25 },
  { upTo: 20, length: 50, width: 40, height: 30 },
  { upTo: 30, length: 60, width: 45, height: 35 },
]

/** Reasonable default parcel dimensions for a weight bracket — carriers price by weight class, not exact size. */
export function boxSizeFor(maxWeight: number): BoxSize {
  const match = BOX_SIZES.find((b) => maxWeight <= b.upTo) ?? BOX_SIZES[BOX_SIZES.length - 1]
  return { length: match.length, width: match.width, height: match.height }
}
