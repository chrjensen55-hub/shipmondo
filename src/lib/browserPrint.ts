// Talks to Zebra Browser Print's local REST service (a small app installed on the tablet, not
// part of this codebase — https://www.zebra.com/us/en/support-downloads/software/printer-software/browser-print.html)
// so the wizard can send a ZPL label straight to a paired Zebra printer with no print dialog.
// Browser Print listens on http://localhost:9100 on Windows, Mac, and Android alike; https pages
// are allowed to fetch it because localhost is a "potentially trustworthy origin", so this isn't
// blocked as mixed content.
//
// Rather than asking the user to pick a printer inside our own UI, this relies on Browser Print's
// own "default device" concept: the user sets their Zebra printer as the default once, inside the
// Browser Print app itself, and every print from here just asks for whatever that default is.
const BASE_URL = 'http://localhost:9100/'

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

// Best-effort: used only to populate a picker in admin settings, not the print path itself, since
// the exact shape of this endpoint's response is less consistently documented than /default.
export async function getAvailablePrinters(): Promise<BrowserPrintDevice[]> {
  const res = await fetch(`${BASE_URL}available`)
  const body = (await res.json()) as { printer?: unknown[] }
  const entries = body.printer ?? []
  return entries
    .map((entry) => (typeof entry === 'string' ? parseDeviceText(entry) : (entry as Partial<BrowserPrintDevice>).name && (entry as Partial<BrowserPrintDevice>).uid ? (entry as BrowserPrintDevice) : null))
    .filter((d): d is BrowserPrintDevice => d !== null)
}

export async function isBrowserPrintAvailable(): Promise<boolean> {
  try {
    await fetch(`${BASE_URL}available`)
    return true
  } catch {
    return false
  }
}

export async function printZpl(device: BrowserPrintDevice, zpl: string): Promise<void> {
  const res = await fetch(`${BASE_URL}write`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ device, data: zpl }),
  })
  if (!res.ok) throw new Error(`Browser Print write failed (${res.status})`)
}
