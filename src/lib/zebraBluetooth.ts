// Talks directly to the Zebra printer over Bluetooth Low Energy from the browser, using the
// "Zebra Bluetooth LE Parser Service" documented in Zebra's own Link-OS BLE AppNote
// (2456934.977326) — no separate companion app (Browser Print) needed on the tablet.
//
// Tradeoff, deliberately accepted: this printer (ZD421) only supports the slower "Write With
// Response" BLE write mode from a browser, so each ~50KB ZPL label takes roughly 20-30 seconds to
// transfer in 20-byte chunks. That's much slower than Browser Print's local REST service, but it
// removes the dependency on a separate app staying open and reconnected after every restart.
const SERVICE_UUID = '38eb4a80-c570-11e3-9507-0002a5d5c51b'
const WRITE_CHARACTERISTIC_UUID = '38eb4a82-c570-11e3-9507-0002a5d5c51b'
// The default (unnegotiated) BLE ATT MTU is 23 bytes, 3 of which are protocol overhead, leaving
// 20 usable bytes per write — the same conservative chunk size Zebra's own AppNote example uses,
// safe across devices regardless of whether a larger MTU gets negotiated.
const CHUNK_SIZE = 20
const STORAGE_KEY = 'pak-send-zebra-ble-device'

export type PairedPrinter = { id: string; name: string }

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.bluetooth)
}

export function getPairedPrinter(): PairedPrinter | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PairedPrinter) : null
  } catch {
    return null
  }
}

export function clearPairedPrinter() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // nothing to clean up
  }
}

// Must be called directly from a user click (browser requirement for requestDevice) — done once
// by staff in Admin, never by customers. Grants a persistent permission for this device so later
// reconnects (see getAuthorizedDevice below) don't need to show the picker again.
//
// Uses acceptAllDevices rather than filtering by SERVICE_UUID: Chrome's requestDevice filter only
// matches services a device actively advertises in its BLE broadcast packet, and many peripherals
// (this printer included) only expose custom GATT services after a connection is made, not in the
// advertisement itself — filtering by service found zero devices even though the printer supports
// it. optionalServices grants access to it once connected, and staff pick the right device by
// name from the full list instead.
export async function pairPrinter(): Promise<PairedPrinter> {
  if (!navigator.bluetooth) throw new Error('This browser does not support Web Bluetooth.')
  const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [SERVICE_UUID] })
  const paired: PairedPrinter = { id: device.id, name: device.name || 'Zebra printer' }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(paired))
  } catch {
    // localStorage unavailable — pairing still succeeded for this page load, just won't persist
  }
  return paired
}

// Reconnecting to an already-paired device does not require a fresh user gesture or picker
// prompt, as long as the browser still has getDevices()'s persistent-permissions support and the
// permission wasn't revoked (e.g. by clearing site data) — this is what lets printing happen from
// a plain "Print label" tap instead of needing its own Bluetooth picker every time.
async function getAuthorizedDevice(id: string): Promise<BluetoothDevice | null> {
  if (!navigator.bluetooth?.getDevices) return null
  const devices = await navigator.bluetooth.getDevices()
  return devices.find((d) => d.id === id) ?? null
}

// Used by the status banner: confirms the pairing is still intact (device still authorized)
// without actually opening a GATT connection, so it's cheap enough to poll periodically. Doesn't
// confirm the printer is currently in range/powered on — only an actual print attempt does that.
export async function isPrinterPaired(): Promise<boolean> {
  if (!isWebBluetoothSupported()) return false
  const paired = getPairedPrinter()
  if (!paired) return false
  const device = await getAuthorizedDevice(paired.id)
  return device !== null
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// The GATT connection frequently reports success and then drops again before service discovery
// completes — a well-known Web Bluetooth race, not specific to this printer — so connect() alone
// isn't reliable; the whole connect-then-discover sequence is retried a few times, reconnecting
// from scratch each time, with a short settle delay after connecting before touching services.
async function connectAndGetWriteCharacteristic(device: BluetoothDevice, attempts = 4): Promise<{ server: BluetoothRemoteGATTServer; characteristic: BluetoothRemoteGATTCharacteristic }> {
  if (!device.gatt) throw new Error('This device does not support a GATT connection.')
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(400 * i)
    try {
      const server = await device.gatt.connect()
      await sleep(300)
      const service = await server.getPrimaryService(SERVICE_UUID)
      const characteristic = await service.getCharacteristic(WRITE_CHARACTERISTIC_UUID)
      return { server, characteristic }
    } catch (err) {
      lastErr = err
      try {
        device.gatt.disconnect()
      } catch {
        // already disconnected — nothing to clean up before the next attempt
      }
    }
  }
  throw lastErr
}

export async function printZplViaBluetooth(zpl: string): Promise<void> {
  if (!isWebBluetoothSupported()) throw new Error('This browser does not support Web Bluetooth.')
  const paired = getPairedPrinter()
  if (!paired) throw new Error('No printer paired yet. Go to Admin → Printers to pair one.')
  const device = await getAuthorizedDevice(paired.id)
  if (!device) throw new Error('This browser lost permission for the paired printer. Re-pair it in Admin → Printers.')

  const { server, characteristic } = await connectAndGetWriteCharacteristic(device)
  try {
    const bytes = new TextEncoder().encode(zpl)
    for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
      const chunk = bytes.slice(offset, offset + CHUNK_SIZE)
      if (characteristic.writeValueWithResponse) await characteristic.writeValueWithResponse(chunk)
      else await characteristic.writeValue(chunk)
    }
  } finally {
    server.disconnect()
  }
}
