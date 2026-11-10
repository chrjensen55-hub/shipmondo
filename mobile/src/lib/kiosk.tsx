import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AppState, BackHandler, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Kiosk } from '../../modules/kiosk'

// The one place the code that leaves kiosk mode is defined.
export const KIOSK_EXIT_CODE = '0088'

const MAX_WRONG_CODES = 5
const LOCKOUT_MS = 60_000

// Module-level so closing and reopening the code dialog can't reset the attempt counter.
let wrongCodes = 0
let lockedUntil = 0

export function lockoutSecondsLeft(): number {
  return Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000))
}

export function recordWrongCode(): void {
  wrongCodes += 1
  if (wrongCodes >= MAX_WRONG_CODES) {
    wrongCodes = 0
    lockedUntil = Date.now() + LOCKOUT_MS
  }
}

export function recordRightCode(): void {
  wrongCodes = 0
}

// Last touch anywhere in the booking flow, for the idle reset.
let lastTouchAt = Date.now()
export function markTouch(): void {
  lastTouchAt = Date.now()
}
export function msSinceTouch(): number {
  return Date.now() - lastTouchAt
}
export function nowMs(): number {
  return Date.now()
}

const KEY_FEATURE = 'pak-send-kiosk-enabled'
const KEY_AUTO_START = 'pak-send-kiosk-autostart'
const KEY_WAS_ACTIVE = 'pak-send-kiosk-active'

// On iPhone/iPad the lock is Apple's Guided Access (see modules/kiosk/ios): staff usually start it
// with a triple-click, so the app follows its state instead of switching it like on Android.
const GUIDED_ACCESS = Platform.OS === 'ios'

type KioskContextValue = {
  // True on iPhone/iPad, where kiosk mode is Guided Access rather than Android's lock task.
  guidedAccess: boolean
  loaded: boolean
  featureEnabled: boolean
  autoStart: boolean
  deviceOwner: boolean
  active: boolean
  setFeatureEnabled: (value: boolean) => Promise<void>
  setAutoStart: (value: boolean) => Promise<void>
  activate: () => void
  deactivate: () => void
  removeDeviceOwner: () => boolean
  // Reads the lock state straight from the device (not the last rendered value).
  isLockedNow: () => boolean
}

const KioskContext = createContext<KioskContextValue | null>(null)

export function KioskProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false)
  const [featureEnabled, setFeatureEnabledState] = useState(true)
  const [autoStart, setAutoStartState] = useState(false)
  const [deviceOwner, setDeviceOwner] = useState(false)
  const [active, setActive] = useState(false)
  const bootHandled = useRef(false)

  const refreshStatus = useCallback(() => {
    setDeviceOwner(Kiosk.isDeviceOwner())
    setActive(Kiosk.isLockTaskActive())
  }, [])

  const activate = useCallback(() => {
    Kiosk.enable()
    AsyncStorage.setItem(KEY_WAS_ACTIVE, '1').catch(() => {})
    // Guided Access only counts once iOS has actually started it.
    if (!GUIDED_ACCESS) setActive(true)
    // Screen pinning (not device owner) can still be declined by the user, so confirm the real state.
    setTimeout(refreshStatus, 800)
  }, [refreshStatus])

  const deactivate = useCallback(() => {
    Kiosk.disable()
    AsyncStorage.setItem(KEY_WAS_ACTIVE, '0').catch(() => {})
    setActive(false)
    setTimeout(refreshStatus, 800)
  }, [refreshStatus])

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(KEY_FEATURE), AsyncStorage.getItem(KEY_AUTO_START), AsyncStorage.getItem(KEY_WAS_ACTIVE)])
      .then(([feature, auto, wasActive]) => {
        const featureOn = feature !== '0'
        const autoOn = auto === '1'
        setFeatureEnabledState(featureOn)
        setAutoStartState(autoOn)
        setLoaded(true)
        setDeviceOwner(Kiosk.isDeviceOwner())
        Kiosk.setAutoStart(featureOn && autoOn)
        if (bootHandled.current) return
        bootHandled.current = true
        if (featureOn && (autoOn || wasActive === '1')) {
          Kiosk.enable()
          setActive(true)
          setTimeout(refreshStatus, 800)
        } else if (!featureOn && Kiosk.isLockTaskActive()) {
          Kiosk.disable()
          setActive(false)
        } else {
          setActive(Kiosk.isLockTaskActive())
        }
      })
      .catch(() => setLoaded(true))
  }, [refreshStatus])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshStatus()
    })
    return () => sub.remove()
  }, [refreshStatus])

  // Guided Access is switched on and off with a triple-click, outside the app's own controls.
  useEffect(() => {
    if (!GUIDED_ACCESS) return
    const id = setInterval(refreshStatus, 2000)
    return () => clearInterval(id)
  }, [refreshStatus])

  async function setFeatureEnabled(value: boolean) {
    setFeatureEnabledState(value)
    await AsyncStorage.setItem(KEY_FEATURE, value ? '1' : '0')
    if (!value) {
      deactivate()
      Kiosk.setAutoStart(false)
    } else {
      Kiosk.setAutoStart(autoStart)
    }
  }

  async function setAutoStart(value: boolean) {
    setAutoStartState(value)
    await AsyncStorage.setItem(KEY_AUTO_START, value ? '1' : '0')
    Kiosk.setAutoStart(featureEnabled && value)
  }

  function removeDeviceOwner() {
    deactivate()
    Kiosk.setAutoStart(false)
    const ok = Kiosk.removeDeviceOwner()
    refreshStatus()
    return ok
  }

  return (
    <KioskContext.Provider value={{ guidedAccess: GUIDED_ACCESS, loaded, featureEnabled, autoStart, deviceOwner, active, setFeatureEnabled, setAutoStart, activate, deactivate, removeDeviceOwner, isLockedNow: Kiosk.isLockTaskActive }}>
      {children}
    </KioskContext.Provider>
  )
}

export function useKiosk() {
  const ctx = useContext(KioskContext)
  if (!ctx) throw new Error('useKiosk must be used within KioskProvider')
  return ctx
}

// While locked, hardware Back only steps back inside the app and can never leave it.
export function KioskBackGuard() {
  const { active } = useKiosk()
  const router = useRouter()
  useEffect(() => {
    if (!active) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (router.canGoBack()) router.back()
      return true
    })
    return () => sub.remove()
  }, [active, router])
  return null
}
