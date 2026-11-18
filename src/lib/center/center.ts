import type { Kv, KvCommand } from './kv'

// The Message Center: head office (the web admin) and each shop location (the tablet app's admin)
// write to one thread per location. Tablets report in every few minutes, which gives the online
// status and app version, and every booking adds to plain counters per location and day.
// Nothing about customers is stored here: only counts, carrier names and the messages themselves.

export type CenterLink = { url: string; label: string }
export type CenterMessage = { id: string; from: 'office' | 'location'; text: string; link?: CenterLink; createdAt: number; emailed?: boolean }
export type CenterDevice = { deviceId: string; locationId: string; locationName: string; appVersion: string; platform: string; lastSeen: number }
export type Counts = { shipments: number; parcels: number }
export type CenterLocation = {
  id: string
  name: string
  email: string
  // False for the two collecting groups (website bookings, older app versions): no tablet reads them.
  canMessage: boolean
  online: boolean
  lastSeen: number | null
  appVersion: string
  devices: CenterDevice[]
  // Answers from the location that head office has not opened yet.
  unreadReplies: number
  // Messages from head office that the location has not opened yet.
  unreadForLocation: number
  stats: { today: Counts; last7: Counts; last30: Counts; total: Counts; carriers: { name: string; count: number }[]; days: ({ date: string } & Counts)[] }
}
export type CenterOverview = {
  locations: CenterLocation[]
  totals: { today: Counts; last7: Counts; last30: Counts; total: Counts; carriers: { name: string; count: number }[]; online: number; connected: number }
}

// Same ids and names as the tablet app (mobile/src/lib/locations.ts). The free slots only show up
// here once a tablet uses them.
export const KNOWN_LOCATIONS: { id: string; name: string; placeholder?: boolean }[] = [
  { id: 'courier-copenhagen', name: 'Courier Copenhagen' },
  { id: 'lyngby', name: 'Pak og Send Lyngby' },
  { id: 'borups-alle', name: 'Pak og Send Borups Allé' },
  ...Array.from({ length: 7 }, (_, i) => ({ id: `location-${i + 4}`, name: `Location ${i + 4}`, placeholder: true })),
]

// Bookings that can't be tied to a location's tablet still count, under these two names.
export const WEB_LOCATION_ID = 'web'
export const UNKNOWN_LOCATION_ID = 'unknown'
const COLLECTING: Record<string, string> = { [WEB_LOCATION_ID]: 'Website bookings', [UNKNOWN_LOCATION_ID]: 'Older app versions' }

export const LOCATION_ID_RE = /^[a-z0-9-]{1,40}$/
// Tablets report every 3 minutes; two missed reports in a row count as offline.
export const ONLINE_WINDOW_MS = 8 * 60 * 1000
const DEVICE_FORGET_MS = 45 * 24 * 60 * 60 * 1000
const THREAD_LIMIT = 500
const DAY_TTL_SECONDS = 400 * 24 * 60 * 60

const K = {
  devices: 'pc:devices',
  meta: 'pc:locmeta',
  unreadOffice: 'pc:unread:office',
  unreadLocation: 'pc:unread:location',
  totals: 'pc:totals',
  day: (date: string) => `pc:day:${date}`,
  thread: (locationId: string) => `pc:msgs:${locationId}`,
}

const DAY_FORMAT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Copenhagen', year: 'numeric', month: '2-digit', day: '2-digit' })

// The calendar day in Denmark, as YYYY-MM-DD.
export function dayKey(ms: number): string {
  return DAY_FORMAT.format(new Date(ms))
}

// The last `count` Danish calendar days, newest first.
export function lastDays(now: number, count: number): string[] {
  const days: string[] = []
  // Step back from midday so a daylight-saving change never skips or repeats a date.
  const [y, m, d] = dayKey(now).split('-').map(Number)
  const midday = Date.UTC(y, m - 1, d, 12)
  for (let i = 0; i < count; i++) days.push(new Date(midday - i * 86_400_000).toISOString().slice(0, 10))
  return days
}

function toHash(value: unknown): Record<string, string> {
  if (Array.isArray(value)) {
    const out: Record<string, string> = {}
    for (let i = 0; i + 1 < value.length; i += 2) out[String(value[i])] = String(value[i + 1])
    return out
  }
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, String(v)]))
  return {}
}

function parseJson<T>(text: unknown): T | null {
  if (typeof text !== 'string') return (text && typeof text === 'object' ? (text as T) : null)
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

function newId(now: number): string {
  return `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// A tablet reporting in. Returns how many head-office messages it has not opened yet.
export async function recordHeartbeat(kv: Kv, input: Omit<CenterDevice, 'lastSeen'>, now = Date.now()): Promise<{ unread: number }> {
  const device: CenterDevice = { ...input, lastSeen: now }
  const [, unread] = await kv.run([
    ['HSET', K.devices, input.deviceId, JSON.stringify(device)],
    ['HGET', K.unreadLocation, input.locationId],
  ])
  return { unread: Number(unread ?? 0) || 0 }
}

export async function getThread(kv: Kv, locationId: string): Promise<CenterMessage[]> {
  const [items] = await kv.run([['LRANGE', K.thread(locationId), 0, -1]])
  return (Array.isArray(items) ? items : []).map((item) => parseJson<CenterMessage>(item)).filter((m): m is CenterMessage => m !== null)
}

function appendCommands(locationId: string, message: CenterMessage, unreadKey: string): KvCommand[] {
  return [
    ['RPUSH', K.thread(locationId), JSON.stringify(message)],
    ['LTRIM', K.thread(locationId), -THREAD_LIMIT, -1],
    ['HINCRBY', unreadKey, locationId, 1],
  ]
}

// Head office writes to one or more locations. Each location gets its own copy in its own thread.
export async function sendOfficeMessage(kv: Kv, locationIds: string[], content: { text: string; link?: CenterLink; emailedTo?: string[] }, now = Date.now()): Promise<CenterMessage[]> {
  const messages = locationIds.map((locationId) => ({
    locationId,
    message: { id: newId(now), from: 'office' as const, text: content.text, ...(content.link ? { link: content.link } : {}), createdAt: now, ...(content.emailedTo?.includes(locationId) ? { emailed: true } : {}) },
  }))
  await kv.run(messages.flatMap(({ locationId, message }) => appendCommands(locationId, message, K.unreadLocation)))
  return messages.map((m) => m.message)
}

// A location answers head office.
export async function sendLocationReply(kv: Kv, locationId: string, text: string, now = Date.now()): Promise<CenterMessage> {
  const message: CenterMessage = { id: newId(now), from: 'location', text, createdAt: now }
  await kv.run(appendCommands(locationId, message, K.unreadOffice))
  return message
}

// Opening a thread clears the reader's own counter: "location" for the tablet, "office" for the web admin.
export async function markThreadRead(kv: Kv, locationId: string, reader: 'location' | 'office'): Promise<void> {
  await kv.run([['HSET', reader === 'location' ? K.unreadLocation : K.unreadOffice, locationId, 0]])
}

export async function setLocationEmail(kv: Kv, locationId: string, email: string): Promise<void> {
  await kv.run([['HSET', K.meta, locationId, JSON.stringify({ email })]])
}

export async function getLocationEmails(kv: Kv): Promise<Record<string, string>> {
  const [meta] = await kv.run([['HGETALL', K.meta]])
  return Object.fromEntries(Object.entries(toHash(meta)).map(([id, json]) => [id, parseJson<{ email?: string }>(json)?.email ?? '']))
}

// One booked shipment: adds to the location's counters for today and in total.
export async function recordShipment(kv: Kv, input: { locationId: string; carrier: string; parcels: number }, now = Date.now()): Promise<void> {
  const locationId = LOCATION_ID_RE.test(input.locationId) ? input.locationId : UNKNOWN_LOCATION_ID
  const carrier = input.carrier.replace(/[|:]/g, ' ').trim().slice(0, 30) || 'Other'
  const parcels = Math.max(1, Math.round(input.parcels) || 1)
  const day = K.day(dayKey(now))
  const add = (key: string): KvCommand[] => [
    ['HINCRBY', key, `${locationId}|shipments`, 1],
    ['HINCRBY', key, `${locationId}|parcels`, parcels],
    ['HINCRBY', key, `${locationId}|carrier:${carrier}`, 1],
  ]
  await kv.run([...add(K.totals), ...add(day), ['EXPIRE', day, DAY_TTL_SECONDS]])
}

const zero = (): Counts => ({ shipments: 0, parcels: 0 })
const plus = (a: Counts, b: Counts): Counts => ({ shipments: a.shipments + b.shipments, parcels: a.parcels + b.parcels })

// "location|metric" fields of one counter hash, grouped per location.
function perLocation(hashValue: unknown): Map<string, { counts: Counts; carriers: Map<string, number> }> {
  const out = new Map<string, { counts: Counts; carriers: Map<string, number> }>()
  for (const [field, raw] of Object.entries(toHash(hashValue))) {
    const split = field.indexOf('|')
    if (split < 1) continue
    const locationId = field.slice(0, split)
    const metric = field.slice(split + 1)
    const value = Number(raw) || 0
    const entry = out.get(locationId) ?? { counts: zero(), carriers: new Map<string, number>() }
    if (metric === 'shipments') entry.counts.shipments += value
    else if (metric === 'parcels') entry.counts.parcels += value
    else if (metric.startsWith('carrier:')) entry.carriers.set(metric.slice(8), (entry.carriers.get(metric.slice(8)) ?? 0) + value)
    out.set(locationId, entry)
  }
  return out
}

const carrierList = (carriers: Map<string, number>) => [...carriers.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)

// Everything the Message Center page shows, read in one round trip.
export async function getOverview(kv: Kv, now = Date.now()): Promise<CenterOverview> {
  const days = lastDays(now, 30)
  const [devicesRaw, metaRaw, unreadOfficeRaw, unreadLocationRaw, totalsRaw, ...dayRaws] = await kv.run([
    ['HGETALL', K.devices],
    ['HGETALL', K.meta],
    ['HGETALL', K.unreadOffice],
    ['HGETALL', K.unreadLocation],
    ['HGETALL', K.totals],
    ...days.map((d): KvCommand => ['HGETALL', K.day(d)]),
  ])

  const allDevices = Object.values(toHash(devicesRaw)).map((json) => parseJson<CenterDevice>(json)).filter((d): d is CenterDevice => d !== null && LOCATION_ID_RE.test(d.locationId))
  const stale = allDevices.filter((d) => now - d.lastSeen > DEVICE_FORGET_MS)
  // Tablets that have been silent for weeks (replaced or reset) are forgotten.
  if (stale.length) await kv.run([['HDEL', K.devices, ...stale.map((d) => d.deviceId)]]).catch(() => {})
  const devices = allDevices.filter((d) => now - d.lastSeen <= DEVICE_FORGET_MS).sort((a, b) => b.lastSeen - a.lastSeen)

  const meta = toHash(metaRaw)
  const unreadOffice = toHash(unreadOfficeRaw)
  const unreadLocation = toHash(unreadLocationRaw)
  const totals = perLocation(totalsRaw)
  const byDay = dayRaws.map((raw) => perLocation(raw))

  const ids = new Set<string>(KNOWN_LOCATIONS.filter((l) => !l.placeholder).map((l) => l.id))
  devices.forEach((d) => ids.add(d.locationId))
  totals.forEach((_, id) => ids.add(id))
  byDay.forEach((day) => day.forEach((_, id) => ids.add(id)))
  Object.entries(unreadOffice).forEach(([id, n]) => Number(n) > 0 && ids.add(id))

  const locations: CenterLocation[] = [...ids].filter((id) => LOCATION_ID_RE.test(id)).map((id) => {
    const own = devices.filter((d) => d.locationId === id)
    const known = KNOWN_LOCATIONS.find((l) => l.id === id)
    const dayCounts = byDay.map((day) => day.get(id)?.counts ?? zero())
    const sum = (n: number) => dayCounts.slice(0, n).reduce(plus, zero())
    return {
      id,
      name: COLLECTING[id] ?? own[0]?.locationName ?? known?.name ?? id,
      email: parseJson<{ email?: string }>(meta[id])?.email ?? '',
      canMessage: !(id in COLLECTING),
      online: own.some((d) => now - d.lastSeen <= ONLINE_WINDOW_MS),
      lastSeen: own[0]?.lastSeen ?? null,
      appVersion: own[0]?.appVersion ?? '',
      devices: own,
      unreadReplies: Number(unreadOffice[id] ?? 0) || 0,
      unreadForLocation: Number(unreadLocation[id] ?? 0) || 0,
      stats: {
        today: dayCounts[0],
        last7: sum(7),
        last30: sum(30),
        total: totals.get(id)?.counts ?? zero(),
        carriers: carrierList(totals.get(id)?.carriers ?? new Map()),
        days: days.slice(0, 14).map((date, i) => ({ date, ...dayCounts[i] })),
      },
    }
  })

  // Online first, then the ones seen most recently, the collecting groups last.
  locations.sort((a, b) => Number(b.canMessage) - Number(a.canMessage) || Number(b.online) - Number(a.online) || (b.lastSeen ?? 0) - (a.lastSeen ?? 0) || a.name.localeCompare(b.name))

  const allCarriers = new Map<string, number>()
  totals.forEach((entry) => entry.carriers.forEach((count, name) => allCarriers.set(name, (allCarriers.get(name) ?? 0) + count)))
  const messageable = locations.filter((l) => l.canMessage)
  return {
    locations,
    totals: {
      today: locations.map((l) => l.stats.today).reduce(plus, zero()),
      last7: locations.map((l) => l.stats.last7).reduce(plus, zero()),
      last30: locations.map((l) => l.stats.last30).reduce(plus, zero()),
      total: locations.map((l) => l.stats.total).reduce(plus, zero()),
      carriers: carrierList(allCarriers),
      online: messageable.filter((l) => l.online).length,
      connected: messageable.filter((l) => l.devices.length > 0).length,
    },
  }
}
