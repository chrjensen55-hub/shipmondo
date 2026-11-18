import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'
import { useAuth } from './auth-context'
import { useLocations } from './location-context'
import { setRequestLocation } from './api'
import { sendHeartbeat } from './center'

// Head office counts a location as offline after 8 minutes of silence, so two missed reports.
const HEARTBEAT_MS = 3 * 60 * 1000

type CenterContextValue = {
  // Messages from head office this location has not opened yet.
  unread: number
  refresh: () => Promise<void>
  clearUnread: () => void
}

const CenterContext = createContext<CenterContextValue>({ unread: 0, refresh: async () => {}, clearUnread: () => {} })

// Mounted once at the app root. While staff are signed in it reports in to the Message Center
// when the app opens, every few minutes, and whenever the app comes back to the front. A failed
// report is ignored: it must never get in the way of a booking.
export function CenterProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const { activeLocation, loading } = useLocations()
  const [unread, setUnread] = useState(0)
  const locationId = activeLocation.id
  const locationName = activeLocation.name
  const ready = status === 'signedIn' && !loading

  const refresh = useCallback(async () => {
    try {
      setUnread(await sendHeartbeat({ id: locationId, name: locationName }))
    } catch {
      // Offline, or a server without the Message Center: nothing to show.
    }
  }, [locationId, locationName])

  // Every request names this tablet's location, so bookings are counted for the right shop.
  useEffect(() => {
    if (!loading) setRequestLocation(locationId, locationName)
  }, [loading, locationId, locationName])

  useEffect(() => {
    if (!ready) return
    const first = setTimeout(refresh, 0)
    const timer = setInterval(refresh, HEARTBEAT_MS)
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh()
    })
    return () => {
      clearTimeout(first)
      clearInterval(timer)
      sub.remove()
    }
  }, [ready, refresh])

  const clearUnread = useCallback(() => setUnread(0), [])

  return <CenterContext.Provider value={{ unread, refresh, clearUnread }}>{children}</CenterContext.Provider>
}

export function useCenter() {
  return useContext(CenterContext)
}
