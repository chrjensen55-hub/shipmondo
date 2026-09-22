import { BleManager, type Device } from 'react-native-ble-plx'
import { PermissionsAndroid, Platform } from 'react-native'
import { encode as toBase64 } from 'base-64'
import * as SecureStore from 'expo-secure-store'

// Talks directly to the Zebra printer's own "Zebra Bluetooth LE Parser Service" (documented in
// Zebra's Link-OS BLE AppNote, 2456934.977326) using the platform's real native Bluetooth stack —
// not a browser's Web Bluetooth sandbox, so there's no writeWithoutResponse restriction imposed by
// a browser, no chunking overhead from a JS bridge doing the work in small hops, and no separate
// companion app (Browser Print) that has to stay running. The printer's own BLE write mode
// (Write With Response only, confirmed for the ZD421) still applies regardless of platform, since
// that's a printer-firmware limitation, not a browser one — so don't expect this alone to be
// dramatically faster than the web version, but it is more direct and reliable.
const SERVICE_UUID = '38eb4a80-c570-11e3-9507-0002a5d5c51b'
const WRITE_CHARACTERISTIC_UUID = '38eb4a82-c570-11e3-9507-0002a5d5c51b'
const CHUNK_SIZE = 20
const DEVICE_ID_KEY = 'pak-send-zebra-ble-device-id'
const DEVICE_NAME_KEY = 'pak-send-zebra-ble-device-name'

const manager = new BleManager()

export type ScannedDevice = { id: string; name: string }

export async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true
  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ])
  return Object.values(results).every((r) => r === PermissionsAndroid.RESULTS.GRANTED)
}

// Scans for every nearby Bluetooth device (not filtered by service UUID) — the printer doesn't
// necessarily advertise the Parser Service UUID in its raw advertisement packet, only exposes it
// after connecting, so a service-filtered scan can miss it entirely. Staff pick the right device
// by name instead (see PrinterSettings screen).
export function scanForPrinters(onFound: (device: ScannedDevice) => void, onError: (message: string) => void): () => void {
  manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
    if (error) {
      onError(error.message)
      return
    }
    if (device?.name) onFound({ id: device.id, name: device.name })
  })
  return () => manager.stopDeviceScan()
}

export async function getPairedPrinter(): Promise<ScannedDevice | null> {
  const id = await SecureStore.getItemAsync(DEVICE_ID_KEY)
  const name = await SecureStore.getItemAsync(DEVICE_NAME_KEY)
  return id && name ? { id, name } : null
}

export async function pairPrinter(device: ScannedDevice): Promise<void> {
  await SecureStore.setItemAsync(DEVICE_ID_KEY, device.id)
  await SecureStore.setItemAsync(DEVICE_NAME_KEY, device.name)
}

export async function clearPairedPrinter(): Promise<void> {
  await SecureStore.deleteItemAsync(DEVICE_ID_KEY)
  await SecureStore.deleteItemAsync(DEVICE_NAME_KEY)
}

// Manual UTF-8 encode instead of relying on a global TextEncoder — not guaranteed present on
// every Hermes/React Native version, and ZPL content can include non-ASCII characters (Danish
// æ/ø/å in item descriptions), so plain charCodeAt truncation isn't safe here.
function utf8Bytes(text: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < text.length; i++) {
    const code = text.codePointAt(i)!
    if (code > 0xffff) i++ // consumed a surrogate pair
    if (code < 0x80) bytes.push(code)
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
  }
  return bytes
}

function bytesToBase64(bytes: number[]): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return toBase64(binary)
}

export async function printZplViaBluetooth(zpl: string): Promise<void> {
  const paired = await getPairedPrinter()
  if (!paired) throw new Error('No printer paired yet. Go to Admin → Printer to pair one.')
  const granted = await requestBlePermissions()
  if (!granted) throw new Error('Bluetooth permission is required to print.')

  let device: Device
  try {
    device = await manager.connectToDevice(paired.id, { timeout: 8000 })
  } catch {
    throw new Error('Could not connect to the printer. Make sure it is powered on and in range.')
  }
  try {
    await device.discoverAllServicesAndCharacteristics()
    const bytes = utf8Bytes(zpl)
    for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
      const chunk = bytes.slice(offset, offset + CHUNK_SIZE)
      await device.writeCharacteristicWithResponseForService(SERVICE_UUID, WRITE_CHARACTERISTIC_UUID, bytesToBase64(chunk))
    }
  } finally {
    await device.cancelConnection().catch(() => {})
  }
}

export async function isPrinterPaired(): Promise<boolean> {
  return (await getPairedPrinter()) !== null
}
