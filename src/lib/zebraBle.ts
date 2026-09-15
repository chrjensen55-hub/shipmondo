// Prints ZPL directly to a Zebra printer's built-in Bluetooth Low Energy radio, straight from
// Chrome via the Web Bluetooth API — no companion app needed. This is specifically for printer
// units like the ZD421 "M" configuration (part number ...D0EM00EZ), which only has BLE, not
// Bluetooth Classic or Wi-Fi, so Zebra Browser Print's Bluetooth path (Classic-only) can't reach it.
//
// Zebra's BLE-enabled printers expose a documented "Parser Service" GATT service that accepts raw
// ZPL over a write characteristic:
// https://www.zebra.com/content/dam/support-dam/en/documentation/unrestricted/application-notes/AppNote-BlueToothLE-v4.pdf
const SERVICE_UUID = '38eb4a80-c570-11e3-9507-0002a5d5c51b'
const WRITE_CHARACTERISTIC_UUID = '38eb4a82-c570-11e3-9507-0002a5d5c51b'
const STORAGE_KEY = 'pak-send-ble-printer-id'
const CHUNK_SIZE = 100
const CHUNK_DELAY_MS = 30

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.bluetooth)
}

function rememberDevice(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // localStorage unavailable — the browser's own Bluetooth permission grant still persists,
    // just via requestDevice()'s picker again next time instead of a silent getDevices() match.
  }
}

export function getSelectedDeviceId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

// Explicitly choose which already-granted device is "the" printer, without opening the picker —
// used by the admin device list so switching printers doesn't need a fresh pairing prompt.
export function selectDevice(device: BluetoothDevice) {
  rememberDevice(device.id)
}

// Every Bluetooth device this browser has ever been granted permission to access on this site —
// not just the currently selected one. Lets admin settings show what's available to pick from,
// and lets a re-pair add a device without losing the ones already granted.
export async function getGrantedDevices(): Promise<BluetoothDevice[]> {
  if (!navigator.bluetooth?.getDevices) return []
  return navigator.bluetooth.getDevices()
}

async function getRememberedDevice(): Promise<BluetoothDevice | null> {
  if (!navigator.bluetooth?.getDevices) return null
  const savedId = getSelectedDeviceId()
  if (!savedId) return null
  const devices = await navigator.bluetooth.getDevices()
  return devices.find((d) => d.id === savedId) ?? null
}

// Must be called from a user gesture (e.g. directly inside a button's onClick) — the browser
// requires that for its Bluetooth device picker to be allowed to open.
//
// Deliberately does NOT filter requestDevice() by the parser service UUID: many BLE peripherals,
// printers included, only expose their GATT services after a connection is made, not in the
// broadcast/advertisement packet itself (128-bit custom UUIDs are expensive to fit in the ~31-byte
// legacy advertisement). A `filters: [{ services: [...] }]` scan silently excludes such devices
// from the picker, which looks identical to "the printer isn't there" — acceptAllDevices shows
// every nearby Bluetooth device instead, so the printer is guaranteed to be selectable by name.
export async function pairZebraPrinter(): Promise<BluetoothDevice> {
  if (!navigator.bluetooth) throw new Error('This browser does not support Web Bluetooth.')
  const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [SERVICE_UUID] })
  rememberDevice(device.id)
  return device
}

export async function hasPairedZebraPrinter(): Promise<boolean> {
  return (await getRememberedDevice()) !== null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Prefers a previously paired printer (no browser dialog). Falls back to opening the picker,
// which only works if this call is still within a user gesture (e.g. the same click that
// triggered printing) — pair the printer ahead of time from admin settings to avoid that, or
// call this as early as possible in a click handler, before any other awaited work.
export async function ensureZebraDevice(): Promise<BluetoothDevice> {
  if (!navigator.bluetooth) throw new Error('This browser does not support Web Bluetooth.')
  return (await getRememberedDevice()) ?? (await pairZebraPrinter())
}

export async function writeZplToDevice(device: BluetoothDevice, zpl: string): Promise<void> {
  if (!device.gatt) throw new Error('This device does not expose Bluetooth GATT.')
  const server = await device.gatt.connect()
  try {
    const service = await server.getPrimaryService(SERVICE_UUID)
    const characteristic = await service.getCharacteristic(WRITE_CHARACTERISTIC_UUID)
    const bytes = new TextEncoder().encode(zpl)
    for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
      const chunk = bytes.slice(offset, offset + CHUNK_SIZE)
      if (characteristic.writeValueWithoutResponse) await characteristic.writeValueWithoutResponse(chunk)
      else await characteristic.writeValue(chunk)
      await sleep(CHUNK_DELAY_MS)
    }
  } finally {
    server.disconnect()
  }
}

export async function printZplOverBle(zpl: string): Promise<void> {
  const device = await ensureZebraDevice()
  await writeZplToDevice(device, zpl)
}
