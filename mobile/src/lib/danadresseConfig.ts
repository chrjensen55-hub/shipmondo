import * as SecureStore from 'expo-secure-store'

// Each tablet/location has its own Danadresse key (the free plan allows 2,000 city lookups per key
// per month), entered once in Settings. It's kept on this device and sent to the server with each
// postal lookup, so every location uses its own quota.
const KEY_STORAGE = 'pak-send-danadresse-key'

export async function getDanadresseKey(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_STORAGE)
}

export async function setDanadresseKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_STORAGE, key.trim())
}

export async function clearDanadresseKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_STORAGE)
}
