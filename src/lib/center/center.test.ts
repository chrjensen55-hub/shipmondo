import { describe, expect, it } from 'vitest'
import { createMemoryKv, createRestKv } from './kv'
import { ONLINE_WINDOW_MS, dayKey, getLocationEmails, getOverview, getThread, lastDays, markThreadRead, recordHeartbeat, recordShipment, sendLocationReply, sendOfficeMessage, setLocationEmail } from './center'

// Wednesday 18 November 2026, 10:00 in Denmark.
const NOW = Date.parse('2026-11-18T09:00:00Z')
const tablet = { locationId: 'lyngby', locationName: 'Pak og Send Lyngby', deviceId: 'device-0001', appVersion: '1.10.0', platform: 'android' }

describe('days', () => {
  it('uses the Danish calendar day', () => {
    // 23:30 UTC on the 17th is already the 18th in Denmark.
    expect(dayKey(Date.parse('2026-11-17T23:30:00Z'))).toBe('2026-11-18')
  })

  it('lists the last days newest first, across a month change', () => {
    expect(lastDays(Date.parse('2026-12-01T09:00:00Z'), 3)).toEqual(['2026-12-01', '2026-11-30', '2026-11-29'])
  })
})

describe('online status', () => {
  it('shows a location as online while its tablet keeps reporting, then offline', async () => {
    const kv = createMemoryKv()
    await recordHeartbeat(kv, tablet, NOW)
    const fresh = await getOverview(kv, NOW + 60_000)
    const lyngby = fresh.locations.find((l) => l.id === 'lyngby')!
    expect(lyngby.online).toBe(true)
    expect(lyngby.appVersion).toBe('1.10.0')
    expect(fresh.totals.online).toBe(1)

    const later = await getOverview(kv, NOW + ONLINE_WINDOW_MS + 60_000)
    expect(later.locations.find((l) => l.id === 'lyngby')!.online).toBe(false)
    expect(later.locations.find((l) => l.id === 'lyngby')!.lastSeen).toBe(NOW)
  })

  it('always lists the three named shops and hides unused free slots', async () => {
    const overview = await getOverview(createMemoryKv(), NOW)
    expect(overview.locations.map((l) => l.id).sort()).toEqual(['borups-alle', 'courier-copenhagen', 'lyngby'])
    expect(overview.locations.every((l) => !l.online && l.lastSeen === null)).toBe(true)
  })

  it('shows a free slot once a tablet uses it, and moves a tablet that changes location', async () => {
    const kv = createMemoryKv()
    await recordHeartbeat(kv, { ...tablet, locationId: 'location-4', locationName: 'Location 4' }, NOW)
    expect((await getOverview(kv, NOW)).locations.some((l) => l.id === 'location-4' && l.online)).toBe(true)
    await recordHeartbeat(kv, tablet, NOW + 1000)
    const overview = await getOverview(kv, NOW + 2000)
    expect(overview.locations.find((l) => l.id === 'lyngby')!.devices).toHaveLength(1)
    expect(overview.locations.some((l) => l.id === 'location-4')).toBe(false)
  })

  it('forgets a tablet that has been silent for weeks', async () => {
    const kv = createMemoryKv()
    await recordHeartbeat(kv, tablet, NOW)
    const muchLater = NOW + 60 * 24 * 60 * 60 * 1000
    expect((await getOverview(kv, muchLater)).locations.find((l) => l.id === 'lyngby')!.devices).toHaveLength(0)
  })
})

describe('messages', () => {
  it('delivers a head-office message with a button link and counts it as unread for the location', async () => {
    const kv = createMemoryKv()
    await sendOfficeMessage(kv, ['lyngby', 'borups-alle'], { text: 'New version is ready.', link: { url: 'https://example.com/app.apk', label: 'Download 1.10.0' }, emailedTo: ['lyngby'] }, NOW)

    const thread = await getThread(kv, 'lyngby')
    expect(thread).toHaveLength(1)
    expect(thread[0]).toMatchObject({ from: 'office', text: 'New version is ready.', link: { label: 'Download 1.10.0' }, emailed: true, createdAt: NOW })
    expect((await getThread(kv, 'borups-alle'))[0].emailed).toBeUndefined()
    expect(await getThread(kv, 'courier-copenhagen')).toEqual([])

    expect((await recordHeartbeat(kv, tablet, NOW)).unread).toBe(1)
    await markThreadRead(kv, 'lyngby', 'location')
    expect((await recordHeartbeat(kv, tablet, NOW)).unread).toBe(0)
  })

  it('shows a reply from the location as unread for head office until it is opened', async () => {
    const kv = createMemoryKv()
    await sendOfficeMessage(kv, ['lyngby'], { text: 'Please update today.' }, NOW)
    await sendLocationReply(kv, 'lyngby', 'Done, thanks.', NOW + 1000)

    const thread = await getThread(kv, 'lyngby')
    expect(thread.map((m) => m.from)).toEqual(['office', 'location'])
    expect((await getOverview(kv, NOW + 2000)).locations.find((l) => l.id === 'lyngby')!.unreadReplies).toBe(1)
    await markThreadRead(kv, 'lyngby', 'office')
    expect((await getOverview(kv, NOW + 3000)).locations.find((l) => l.id === 'lyngby')!.unreadReplies).toBe(0)
  })

  it('saves and removes a location e-mail address', async () => {
    const kv = createMemoryKv()
    await setLocationEmail(kv, 'lyngby', 'lyngby@example.dk')
    expect((await getLocationEmails(kv)).lyngby).toBe('lyngby@example.dk')
    expect((await getOverview(kv, NOW)).locations.find((l) => l.id === 'lyngby')!.email).toBe('lyngby@example.dk')
    await setLocationEmail(kv, 'lyngby', '')
    expect((await getLocationEmails(kv)).lyngby).toBe('')
  })
})

describe('parcel numbers', () => {
  it('counts shipments and parcels per location, per day and in total', async () => {
    const kv = createMemoryKv()
    const yesterday = NOW - 24 * 60 * 60 * 1000
    await recordShipment(kv, { locationId: 'lyngby', carrier: 'GLS', parcels: 2 }, yesterday)
    await recordShipment(kv, { locationId: 'lyngby', carrier: 'GLS', parcels: 1 }, NOW)
    await recordShipment(kv, { locationId: 'lyngby', carrier: 'PostNord', parcels: 1 }, NOW)
    await recordShipment(kv, { locationId: 'courier-copenhagen', carrier: 'DAO', parcels: 3 }, NOW)

    const overview = await getOverview(kv, NOW)
    const lyngby = overview.locations.find((l) => l.id === 'lyngby')!
    expect(lyngby.stats.today).toEqual({ shipments: 2, parcels: 2 })
    expect(lyngby.stats.last7).toEqual({ shipments: 3, parcels: 4 })
    expect(lyngby.stats.total).toEqual({ shipments: 3, parcels: 4 })
    expect(lyngby.stats.carriers).toEqual([{ name: 'GLS', count: 2 }, { name: 'PostNord', count: 1 }])
    expect(lyngby.stats.days[0]).toEqual({ date: '2026-11-18', shipments: 2, parcels: 2 })
    expect(lyngby.stats.days[1]).toEqual({ date: '2026-11-17', shipments: 1, parcels: 2 })
    expect(lyngby.stats.days).toHaveLength(14)

    expect(overview.totals.today).toEqual({ shipments: 3, parcels: 5 })
    expect(overview.totals.total).toEqual({ shipments: 4, parcels: 7 })
    expect(overview.totals.carriers[0]).toEqual({ name: 'GLS', count: 2 })
  })

  it('collects bookings without a known location under their own names', async () => {
    const kv = createMemoryKv()
    await recordShipment(kv, { locationId: 'web', carrier: 'GLS', parcels: 1 }, NOW)
    await recordShipment(kv, { locationId: 'Not A Valid Id!', carrier: 'GLS', parcels: 1 }, NOW)
    const overview = await getOverview(kv, NOW)
    const web = overview.locations.find((l) => l.id === 'web')!
    expect(web).toMatchObject({ name: 'Website bookings', canMessage: false })
    expect(overview.locations.find((l) => l.id === 'unknown')!.stats.total.shipments).toBe(1)
    // The collecting groups come after the real shops.
    expect(overview.locations.slice(-2).map((l) => l.id).sort()).toEqual(['unknown', 'web'])
  })
})

describe('database over REST', () => {
  it('sends the commands as one pipeline and returns each result', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const fakeFetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return new Response(JSON.stringify([{ result: 1 }, { result: ['a', '1', 'b', '2'] }]), { status: 200 })
    }) as unknown as typeof fetch
    const kv = createRestKv('https://example.upstash.io', 'secret-token', fakeFetch)
    const results = await kv.run([['HSET', 'k', 'a', 1], ['HGETALL', 'k']])
    expect(results).toEqual([1, ['a', '1', 'b', '2']])
    expect(calls[0].url).toBe('https://example.upstash.io/pipeline')
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer secret-token')
    expect(JSON.parse(String(calls[0].init.body))).toEqual([['HSET', 'k', 'a', 1], ['HGETALL', 'k']])
  })

  it('reports a failed command instead of returning half an answer', async () => {
    const fakeFetch = (async () => new Response(JSON.stringify([{ result: 1 }, { error: 'WRONGTYPE' }]), { status: 200 })) as unknown as typeof fetch
    await expect(createRestKv('https://example.upstash.io', 't', fakeFetch).run([['HSET', 'k', 'a', 1], ['LRANGE', 'k', 0, -1]])).rejects.toThrow('WRONGTYPE')
  })
})
