// Prints ZPL directly to a Zebra printer over a physical USB cable, using the WebUSB API — no
// companion app, no Bluetooth. This sidesteps every issue the BLE path ran into (flag-gated
// permission persistence, chunked GATT writes, this printer having no Bluetooth Classic or Wi-Fi):
// a wired USB connection is deterministic and WebUSB's own "remember this device" API has shipped
// in Chrome for years, unlike Web Bluetooth's equivalent.
//
// Browsers normally block WebUSB from touching printers at all (the OS's own print subsystem
// claims standard USB Printer Class devices), but Zebra printers expose a vendor-specific USB
// interface instead of the standard printer class specifically so raw ZPL can be streamed to them
// directly — confirmed against real Zebra hardware by existing open-source tools, e.g.
// https://github.com/mkxml/zpl-webusb
//
// Deliberately does NOT filter requestDevice() by Zebra's usual USB vendor ID (0x0A5F): if that ID
// guess were even slightly off for a given unit, the picker would show zero devices, which looks
// identical to "USB isn't working" — same trap the Bluetooth service-UUID filter fell into. An
// empty filters array shows every connected USB device instead, so the printer is guaranteed to be
// selectable by name.

export function isWebUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.usb)
}

let cachedDevice: USBDevice | null = null
let cachedEndpoint: number | null = null

function findOutEndpoint(device: USBDevice): number {
  const iface = device.configuration?.interfaces[0]?.alternate
  const endpoint = iface?.endpoints.find((e) => e.direction === 'out')
  if (!endpoint) throw new Error('No USB OUT endpoint found on this printer.')
  return endpoint.endpointNumber
}

async function openAndClaim(device: USBDevice): Promise<number> {
  if (!device.opened) await device.open()
  if (device.configuration === null) await device.selectConfiguration(1)
  const iface = device.configuration!.interfaces[0]
  if (!iface.claimed) await device.claimInterface(iface.interfaceNumber)
  return findOutEndpoint(device)
}

// Must be called from a user gesture (e.g. directly inside a button's onClick) the first time —
// the browser requires that for its USB device picker to be allowed to open.
export async function pairZebraPrinterUsb(): Promise<USBDevice> {
  if (!navigator.usb) throw new Error('This browser does not support WebUSB.')
  const device = await navigator.usb.requestDevice({ filters: [] })
  cachedEndpoint = await openAndClaim(device)
  cachedDevice = device
  return device
}

export async function getGrantedUsbDevices(): Promise<USBDevice[]> {
  if (!navigator.usb) return []
  return navigator.usb.getDevices()
}

export function getCachedUsbDeviceName(): string | null {
  return cachedDevice?.productName ?? null
}

export function hasCachedUsbPrinter(): boolean {
  return cachedDevice !== null
}

// Prefers a previously granted device (no browser dialog, via WebUSB's stable getDevices() API).
// Falls back to opening the picker, which only works within a user gesture.
export async function ensureZebraUsbDevice(): Promise<USBDevice> {
  if (!navigator.usb) throw new Error('This browser does not support WebUSB.')
  if (cachedDevice) return cachedDevice
  const known = await navigator.usb.getDevices()
  const existing = known[0]
  if (existing) {
    cachedEndpoint = await openAndClaim(existing)
    cachedDevice = existing
    return existing
  }
  return pairZebraPrinterUsb()
}

export async function writeZplToUsbDevice(device: USBDevice, zpl: string): Promise<void> {
  const endpoint = device === cachedDevice && cachedEndpoint !== null ? cachedEndpoint : await openAndClaim(device)
  const bytes = new TextEncoder().encode(zpl)
  const result = await device.transferOut(endpoint, bytes)
  if (result.status !== 'ok') throw new Error(`USB transfer failed: ${result.status}`)
}

export async function printZplOverUsb(zpl: string): Promise<void> {
  const device = await ensureZebraUsbDevice()
  await writeZplToUsbDevice(device, zpl)
}
