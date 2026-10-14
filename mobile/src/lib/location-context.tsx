import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  defaultLocations,
  getActiveLocationId,
  getLocations,
  setActiveLocationId as persistActiveLocationId,
  saveLocation as persistLocation,
  DEFAULT_ACTIVE_LOCATION_ID,
  type LocationConfig,
} from './locations'

type LocationContextValue = {
  locations: LocationConfig[]
  activeLocation: LocationConfig
  activeLocationId: string
  loading: boolean
  selectActiveLocation: (id: string) => Promise<void>
  saveLocation: (location: LocationConfig) => Promise<void>
}

const LocationContext = createContext<LocationContextValue | null>(null)

// Mounted once at the app root so both the customer wizard (which prices/filters carriers off the
// active location) and Admin > Settings (which lets staff pick and edit any location) share the
// same loaded state instead of each re-reading AsyncStorage independently.
export function LocationProvider({ children }: { children: ReactNode }) {
  const [locations, setLocations] = useState<LocationConfig[]>(defaultLocations)
  const [activeLocationId, setActiveLocationIdState] = useState(DEFAULT_ACTIVE_LOCATION_ID)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getLocations(), getActiveLocationId()]).then(([list, id]) => {
      setLocations(list)
      setActiveLocationIdState(id)
      setLoading(false)
    })
  }, [])

  async function selectActiveLocation(id: string) {
    setActiveLocationIdState(id)
    await persistActiveLocationId(id)
  }

  async function saveLocation(location: LocationConfig) {
    const next = await persistLocation(location)
    setLocations(next)
  }

  const activeLocation = locations.find((l) => l.id === activeLocationId) ?? locations[0]

  return (
    <LocationContext.Provider value={{ locations, activeLocation, activeLocationId, loading, selectActiveLocation, saveLocation }}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocations() {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocations must be used within LocationProvider')
  return ctx
}
