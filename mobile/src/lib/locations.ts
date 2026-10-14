import AsyncStorage from '@react-native-async-storage/async-storage'

// Each shop location (Courier Copenhagen, Pak og Send Lyngby, etc.) has its own domestic price
// list, shared by every carrier at that location, and its own set of enabled carriers. This lives
// on-device (not a secret, so AsyncStorage rather than SecureStore — SecureStore's per-value size
// limit on Android is too small for ten locations' full price lists) and is sent to the server as
// part of the shipment draft so /api/quotes and /api/shipments price exactly what this tablet shows.
export type CarrierName = 'DAO' | 'Bring' | 'PostNord' | 'GLS'
export type RateBracket = { maxWeight: number; service_point: number | null; home: number }
export type LocationConfig = {
  id: string
  name: string
  carriers: Record<CarrierName, boolean>
  rates: RateBracket[]
}

const LOCATIONS_KEY = 'pak-send-locations'
const ACTIVE_LOCATION_KEY = 'pak-send-active-location'

export const DEFAULT_ACTIVE_LOCATION_ID = 'courier-copenhagen'

const ALL_CARRIERS_ON: Record<CarrierName, boolean> = { DAO: true, Bring: true, PostNord: true, GLS: true }

// Courier Copenhagen: Pak & Send's existing published domestic price list — used as-is, unchanged.
const COURIER_COPENHAGEN_RATES: RateBracket[] = [
  { maxWeight: 1, service_point: 89, home: 119 },
  { maxWeight: 5, service_point: 98, home: 149 },
  { maxWeight: 10, service_point: 149, home: 189 },
  { maxWeight: 20, service_point: 198, home: 239 },
  { maxWeight: 35, service_point: null, home: 379 },
]

// Pak og Send Lyngby: "Postpakker Danmark 2026", identical for every carrier at this location.
const LYNGBY_RATES: RateBracket[] = [
  { maxWeight: 1, service_point: 59, home: 79 },
  { maxWeight: 2, service_point: 74, home: 98 },
  { maxWeight: 5, service_point: 109, home: 129 },
  { maxWeight: 10, service_point: 139, home: 179 },
  { maxWeight: 20, service_point: 198, home: 229 },
  { maxWeight: 35, service_point: null, home: 379 },
]

function cloneRates(rates: RateBracket[]): RateBracket[] {
  return rates.map((r) => ({ ...r }))
}

export function defaultLocations(): LocationConfig[] {
  return [
    { id: 'courier-copenhagen', name: 'Courier Copenhagen', carriers: { ...ALL_CARRIERS_ON }, rates: cloneRates(COURIER_COPENHAGEN_RATES) },
    { id: 'lyngby', name: 'Pak og Send Lyngby', carriers: { ...ALL_CARRIERS_ON }, rates: cloneRates(LYNGBY_RATES) },
    { id: 'borups-alle', name: 'Pak og Send Borups Allé', carriers: { ...ALL_CARRIERS_ON }, rates: cloneRates(COURIER_COPENHAGEN_RATES) },
    // Free slots, set up later — start as a copy of Courier Copenhagen so the app never shows an
    // empty price list.
    ...Array.from({ length: 7 }, (_, i) => ({
      id: `location-${i + 4}`,
      name: `Location ${i + 4}`,
      carriers: { ...ALL_CARRIERS_ON },
      rates: cloneRates(COURIER_COPENHAGEN_RATES),
    })),
  ]
}

export async function getLocations(): Promise<LocationConfig[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCATIONS_KEY)
    if (!raw) return defaultLocations()
    const saved = JSON.parse(raw) as LocationConfig[]
    // Always return exactly the known ten locations, filling in defaults for anything missing from
    // what was saved (e.g. an app update introduces a location that didn't exist on this device yet).
    return defaultLocations().map((def) => saved.find((s) => s.id === def.id) ?? def)
  } catch {
    return defaultLocations()
  }
}

export async function saveLocations(locations: LocationConfig[]): Promise<void> {
  await AsyncStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations))
}

export async function saveLocation(location: LocationConfig): Promise<LocationConfig[]> {
  const locations = await getLocations()
  const next = locations.map((l) => (l.id === location.id ? location : l))
  await saveLocations(next)
  return next
}

export async function getActiveLocationId(): Promise<string> {
  const saved = await AsyncStorage.getItem(ACTIVE_LOCATION_KEY)
  return saved ?? DEFAULT_ACTIVE_LOCATION_ID
}

export async function setActiveLocationId(id: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_LOCATION_KEY, id)
}

export function enabledCarrierNames(location: LocationConfig): CarrierName[] {
  return (Object.keys(location.carriers) as CarrierName[]).filter((name) => location.carriers[name])
}
