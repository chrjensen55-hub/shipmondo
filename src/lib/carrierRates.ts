export type DeliveryLocation = 'home' | 'service_point'
export type BoxSize = { length: number; width: number; height: number }

// Pak & Send's own published price list (DKK, incl. VAT) — applied the same regardless of which
// carrier is booked. `maxWeight` is the upper bound (kg) of that weight class.

// "POSTPAKKER DANMARK 2026": Collect (service point) vs Home. Collect has no 35 kg tier ("Ikke muligt").
type DomesticBracket = { maxWeight: number; service_point: number | null; home: number }
const DOMESTIC_BRACKETS: DomesticBracket[] = [
  { maxWeight: 1, service_point: 89, home: 119 },
  { maxWeight: 5, service_point: 98, home: 149 },
  { maxWeight: 10, service_point: 149, home: 189 },
  { maxWeight: 20, service_point: 198, home: 239 },
  { maxWeight: 35, service_point: null, home: 379 },
]

// "POSTPAKKER UDLAND 2026 - FRB": one price per weight class per zone (no Home/Collect split).
export type IntlZone = 'europe1' | 'europe2' | 'norway_switzerland_liechtenstein' | 'rest_of_world' | 'faroe_islands' | 'greenland'
type IntlBracket = { maxWeight: number; prices: Record<IntlZone, number> }
const INTERNATIONAL_BRACKETS: IntlBracket[] = [
  { maxWeight: 1, prices: { europe1: 214, europe2: 267, norway_switzerland_liechtenstein: 467, rest_of_world: 511, faroe_islands: 484, greenland: 487 } },
  { maxWeight: 2, prices: { europe1: 259, europe2: 298, norway_switzerland_liechtenstein: 510, rest_of_world: 625, faroe_islands: 512, greenland: 590 } },
  { maxWeight: 5, prices: { europe1: 311, europe2: 356, norway_switzerland_liechtenstein: 556, rest_of_world: 783, faroe_islands: 553, greenland: 736 } },
  { maxWeight: 10, prices: { europe1: 503, europe2: 558, norway_switzerland_liechtenstein: 758, rest_of_world: 1149, faroe_islands: 752, greenland: 1154 } },
  { maxWeight: 15, prices: { europe1: 598, europe2: 720, norway_switzerland_liechtenstein: 920, rest_of_world: 1605, faroe_islands: 1000, greenland: 1628 } },
  { maxWeight: 20, prices: { europe1: 773, europe2: 892, norway_switzerland_liechtenstein: 1092, rest_of_world: 2060, faroe_islands: 1147, greenland: 2134 } },
]

// Country groupings from the price list's own footnote. Norway/Switzerland/Liechtenstein get their
// own dedicated column on the sheet, so they're matched before the general Europe 2 list.
const EUROPE_1 = new Set(['BE', 'BG', 'CY', 'EE', 'FI', 'FR', 'IE', 'IT', 'HR', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'GB', 'SE', 'CZ', 'DE', 'HU', 'AT'])
const EUROPE_2 = new Set(['AL', 'AD', 'AM', 'AZ', 'BA', 'GE', 'GI', 'GG', 'GR', 'BY', 'IS', 'JE', 'KZ', 'KG', 'MK', 'MD', 'ME', 'RU', 'SM', 'RS', 'TJ', 'TR', 'UA', 'UZ', 'VA'])
const NORWAY_SWITZERLAND_LIECHTENSTEIN = new Set(['NO', 'CH', 'LI'])

function intlZoneFor(countryCode: string): IntlZone {
  if (countryCode === 'FO') return 'faroe_islands'
  if (countryCode === 'GL') return 'greenland'
  if (NORWAY_SWITZERLAND_LIECHTENSTEIN.has(countryCode)) return 'norway_switzerland_liechtenstein'
  if (EUROPE_1.has(countryCode)) return 'europe1'
  if (EUROPE_2.has(countryCode)) return 'europe2'
  return 'rest_of_world'
}

export function isDomestic(originCountry: string, destinationCountry: string): boolean {
  return originCountry === destinationCountry
}

/** Pak & Send's real price (DKK) for this route/location/weight, or undefined once it exceeds the max weight. */
export function rateForWeight(originCountry: string, destinationCountry: string, location: DeliveryLocation, weightKg: number): number | undefined {
  if (isDomestic(originCountry, destinationCountry)) {
    const bracket = DOMESTIC_BRACKETS.find((b) => weightKg <= b.maxWeight)
    if (!bracket) return undefined
    return location === 'service_point' ? (bracket.service_point ?? undefined) : bracket.home
  }
  const zone = intlZoneFor(destinationCountry)
  return INTERNATIONAL_BRACKETS.find((b) => weightKg <= b.maxWeight)?.prices[zone]
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b)
}

/**
 * Weight-class options for the wizard's Parcel step. The Parcel step runs before the recipient's
 * address is known, so this shows the merged set of both the domestic and international weight
 * classes for the chosen delivery location — `rateForWeight` resolves the real price for the
 * actual route once the destination is known, regardless of which of these was picked.
 */
export function weightBrackets(location: DeliveryLocation): number[] {
  const domestic = DOMESTIC_BRACKETS.filter((b) => location !== 'service_point' || b.service_point !== null).map((b) => b.maxWeight)
  const intl = INTERNATIONAL_BRACKETS.map((b) => b.maxWeight)
  return uniqueSorted([...domestic, ...intl])
}

export function maxWeightFor(location: DeliveryLocation): number | undefined {
  const brackets = weightBrackets(location)
  return brackets[brackets.length - 1]
}

const BOX_SIZES: (BoxSize & { upTo: number })[] = [
  { upTo: 1, length: 30, width: 20, height: 8 },
  { upTo: 3, length: 35, width: 25, height: 15 },
  { upTo: 5, length: 40, width: 30, height: 20 },
  { upTo: 10, length: 45, width: 35, height: 25 },
  { upTo: 20, length: 50, width: 40, height: 30 },
  { upTo: 35, length: 60, width: 45, height: 35 },
]

/** Reasonable default parcel dimensions for a weight bracket — the price list prices by weight class, not exact size. */
export function boxSizeFor(maxWeight: number): BoxSize {
  const match = BOX_SIZES.find((b) => maxWeight <= b.upTo) ?? BOX_SIZES[BOX_SIZES.length - 1]
  return { length: match.length, width: match.width, height: match.height }
}
