// Talks to Zebra Browser Print's local REST service (a small app installed on the tablet, not
// part of this codebase — https://www.zebra.com/us/en/support-downloads/software/printer-software/browser-print.html)
// so the wizard can send a ZPL label straight to a paired Zebra printer with no print dialog.
// Browser Print listens on http://localhost:9100 on Windows, Mac, and Android alike; https pages
// are allowed to fetch it because localhost is a "potentially trustworthy origin", so this isn't
// blocked as mixed content.
//
// The printer to use is chosen from admin settings and saved here (localStorage, per tablet) rather
// than relying on Browser Print's own internal "default device" setting — that has to be configured
// inside the Browser Print app itself and can silently reset (app data cleared, app reinstalled,
// printer re-paired), which then breaks printing with no way to fix it from our own admin UI.
const BASE_URL = 'http://localhost:9100/'
const STORAGE_KEY = 'pak-send-browserprint-device'

export type BrowserPrintDevice = { name: string; uid: string; connection: string; deviceType: string; manufacturer: string; provider: string }

// The /default endpoint returns a plain-text block like:
// "...\n\tName: ZTC ZD421-203dpi ZPL\n\tDevice Type: printer\n\tConnection: bluetooth\n\tUid: ...\n\tProvider: ...\n\tManufacturer: ..."
function parseDeviceText(text: string): BrowserPrintDevice | null {
  const field = (label: string) => text.split(`${label}:`)[1]?.split('\n')[0]?.trim()
  const name = field('Name')
  const uid = field('Uid')
  if (!name || !uid) return null
  return { name, uid, connection: field('Connection') ?? '', deviceType: field('Device Type') ?? '', manufacturer: field('Manufacturer') ?? '', provider: field('Provider') ?? '' }
}

export async function getDefaultPrinter(): Promise<BrowserPrintDevice | null> {
  const res = await fetch(`${BASE_URL}default`)
  const text = await res.text()
  return parseDeviceText(text)
}

function parseDeviceEntry(entry: unknown): BrowserPrintDevice | null {
  if (typeof entry === 'string') return parseDeviceText(entry)
  if (entry && typeof entry === 'object') {
    const o = entry as Record<string, unknown>
    const name = o.name ?? o.Name
    const uid = o.uid ?? o.Uid
    if (typeof name === 'string' && typeof uid === 'string') {
      const str = (v: unknown) => (typeof v === 'string' ? v : '')
      return { name, uid, connection: str(o.connection ?? o.Connection), deviceType: str(o.deviceType ?? o['Device Type']), manufacturer: str(o.manufacturer ?? o.Manufacturer), provider: str(o.provider ?? o.Provider) }
    }
  }
  return null
}

// The exact shape of this endpoint's response is less consistently documented than /default, so
// parsing is deliberately defensive about both plain-text and JSON-object entries.
export async function getAvailablePrinters(): Promise<BrowserPrintDevice[]> {
  const res = await fetch(`${BASE_URL}available`)
  const body = (await res.json()) as { printer?: unknown[] }
  const entries = body.printer ?? []
  return entries.map(parseDeviceEntry).filter((d): d is BrowserPrintDevice => d !== null)
}

export async function isBrowserPrintAvailable(): Promise<boolean> {
  try {
    await fetch(`${BASE_URL}available`)
    return true
  } catch {
    return false
  }
}

// The printer chosen once in admin settings — this is what every print should use, so customers
// are never asked to pick one and a reset inside the Browser Print app can't silently break things.
export function getSelectedPrinter(): BrowserPrintDevice | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as BrowserPrintDevice) : null
  } catch {
    return null
  }
}

export function selectPrinter(device: BrowserPrintDevice) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(device))
  } catch {
    // localStorage unavailable — falls back to Browser Print's own default device instead
  }
}

export function clearSelectedPrinter() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // nothing to clean up
  }
}

// Prefers the printer explicitly chosen in admin settings; falls back to Browser Print's own
// default device (e.g. on first run, before anyone has picked one from our admin page yet).
export async function getPrinterToUse(): Promise<BrowserPrintDevice | null> {
  const selected = getSelectedPrinter()
  if (selected) return selected
  return getDefaultPrinter()
}

export async function printZpl(device: BrowserPrintDevice, zpl: string): Promise<void> {
  const res = await fetch(`${BASE_URL}write`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ device, data: zpl }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Browser Print write failed (${res.status})${body ? `: ${body}` : ''}`)
  }
}
