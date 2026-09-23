import * as SecureStore from 'expo-secure-store'

// A quick 4-digit gate for the Settings/Admin section, separate from the real staff login - the
// login happens once in the office when the tablet is set up (see auth-context.tsx) and then
// stays signed in for a year; this PIN is the day-to-day deterrent that stops a customer using
// the booking wizard from wandering into Settings, not a real security boundary on its own (the
// whole app already sits behind that initial device-level login).
const PIN_KEY = 'pak-send-settings-pin'
const DEFAULT_PIN = '0000'

export async function getSettingsPin(): Promise<string> {
  return (await SecureStore.getItemAsync(PIN_KEY)) ?? DEFAULT_PIN
}

export async function setSettingsPin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(PIN_KEY, pin)
}
