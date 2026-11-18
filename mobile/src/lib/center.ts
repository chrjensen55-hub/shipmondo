import * as SecureStore from 'expo-secure-store'
import * as Crypto from 'expo-crypto'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { api } from './api'

// The tablet's side of the Message Center (see the web app's src/lib/center): it reports in every
// few minutes so head office can see the location is online and which app version it runs, and it
// reads and answers the messages head office writes to this location.

export type CenterLink = { url: string; label: string }
export type CenterMessage = { id: string; from: 'office' | 'location'; text: string; link?: CenterLink; createdAt: number }

export const APP_VERSION = Constants.expoConfig?.version ?? ''

const DEVICE_ID_KEY = 'pak-send-device-id'
let cachedDeviceId: string | null = null

// A random id made once per installation, so two tablets at one location count as two.
async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId
  let id = await SecureStore.getItemAsync(DEVICE_ID_KEY)
  if (!id) {
    id = Crypto.randomUUID()
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id)
  }
  cachedDeviceId = id
  return id
}

// Reports in and returns how many messages from head office have not been opened yet.
export async function sendHeartbeat(location: { id: string; name: string }): Promise<number> {
  const data = await api<{ unread: number }>('/api/center/heartbeat', {
    method: 'POST',
    body: JSON.stringify({ locationId: location.id, locationName: location.name, deviceId: await getDeviceId(), appVersion: APP_VERSION, platform: Platform.OS }),
  })
  return data.unread
}

export async function fetchThread(locationId: string): Promise<{ messages: CenterMessage[]; configured: boolean }> {
  return api<{ messages: CenterMessage[]; configured: boolean }>(`/api/center/thread?locationId=${encodeURIComponent(locationId)}`)
}

export async function sendReply(locationId: string, text: string): Promise<CenterMessage> {
  const data = await api<{ message: CenterMessage }>('/api/center/reply', { method: 'POST', body: JSON.stringify({ locationId, text }) })
  return data.message
}

export async function markThreadRead(locationId: string): Promise<void> {
  await api('/api/center/read', { method: 'POST', body: JSON.stringify({ locationId, reader: 'location' }) })
}
