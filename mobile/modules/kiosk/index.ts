import { requireOptionalNativeModule } from 'expo'

type KioskNative = {
  isDeviceOwner(): boolean
  isLockTaskActive(): boolean
  enable(): boolean
  disable(): void
  setAutoStart(enabled: boolean): boolean
  removeDeviceOwner(): boolean
}

// Missing on web and in Expo Go, so every call is guarded and falls back to "not kiosk".
const native = requireOptionalNativeModule<KioskNative>('Kiosk')

function safe<T>(fn: (m: KioskNative) => T, fallback: T): T {
  if (!native) return fallback
  try {
    return fn(native)
  } catch {
    return fallback
  }
}

export const Kiosk = {
  available: native != null,
  isDeviceOwner: () => safe((m) => m.isDeviceOwner(), false),
  isLockTaskActive: () => safe((m) => m.isLockTaskActive(), false),
  enable: () => safe((m) => m.enable(), false),
  disable: () => safe((m) => m.disable(), undefined),
  setAutoStart: (enabled: boolean) => safe((m) => m.setAutoStart(enabled), false),
  removeDeviceOwner: () => safe((m) => m.removeDeviceOwner(), false),
}
