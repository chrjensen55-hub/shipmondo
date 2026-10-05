import { afterEach, describe, expect, it, vi } from 'vitest'
import { bundledDanishCity, findDanishCity } from './lookup'
import postnumre from './da-postnumre.json'

describe('bundled Danish postal codes', () => {
  it.each([
    ['2730', 'Herlev'],
    ['2000', 'Frederiksberg'],
    ['2100', 'København Ø'],
    ['2800', 'Kongens Lyngby'],
    ['8000', 'Aarhus C'],
    ['9000', 'Aalborg'],
  ])('resolves %s to %s', (nr, city) => {
    expect(bundledDanishCity(nr)).toBe(city)
  })

  it('covers every Danish postal code, not just a few examples', () => {
    expect(Object.keys(postnumre).length).toBeGreaterThan(1000)
  })

  it.each(['0000', '9999'])('returns null for a code that does not exist (%s)', (nr) => {
    expect(bundledDanishCity(nr)).toBeNull()
  })
})

describe('findDanishCity', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the bundled data and makes no network call when a device has no key', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await findDanishCity('2730', null)).toBe('Herlev')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses the device key when Danadresse answers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => [{ nr: '8000', navn: 'Aarhus C' }] }),
    )
    expect(await findDanishCity('8000', 'device-key-a')).toBe('Aarhus C')
  })

  it('falls back to the bundled data when the device key is rejected or over quota', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }))
    expect(await findDanishCity('9000', 'device-key-b')).toBe('Aalborg')
  })
})
