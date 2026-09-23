import * as SecureStore from 'expo-secure-store'

// Per-tablet Shipmondo credentials — each shop location is its own Shipmondo account, entered
// once on this device (Admin -> Settings -> Shipmondo) before the tablet ships to its location.
// Sent as headers on every API request (see api.ts); the backend honors them over its own env
// vars when present (see src/lib/shipmondo/client.ts on the web app side), so this device's
// bookings, quotes and shipment history all use its own account without touching any other
// tablet's configuration.
export type ShipmondoConfig = { baseUrl: string; username: string; apiKey: string }

const BASE_URL_KEY = 'pak-send-shipmondo-base-url'
const USERNAME_KEY = 'pak-send-shipmondo-username'
const API_KEY_KEY = 'pak-send-shipmondo-api-key'

export async function getShipmondoConfig(): Promise<ShipmondoConfig | null> {
  const [baseUrl, username, apiKey] = await Promise.all([
    SecureStore.getItemAsync(BASE_URL_KEY),
    SecureStore.getItemAsync(USERNAME_KEY),
    SecureStore.getItemAsync(API_KEY_KEY),
  ])
  if (!baseUrl || !username || !apiKey) return null
  return { baseUrl, username, apiKey }
}

export async function setShipmondoConfig(config: ShipmondoConfig): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(BASE_URL_KEY, config.baseUrl.trim()),
    SecureStore.setItemAsync(USERNAME_KEY, config.username.trim()),
    SecureStore.setItemAsync(API_KEY_KEY, config.apiKey.trim()),
  ])
}

export async function clearShipmondoConfig(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(BASE_URL_KEY),
    SecureStore.deleteItemAsync(USERNAME_KEY),
    SecureStore.deleteItemAsync(API_KEY_KEY),
  ])
}
