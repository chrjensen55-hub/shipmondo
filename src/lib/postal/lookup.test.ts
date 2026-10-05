import { describe, expect, it } from 'vitest'
import { bundledDanishCity } from './lookup'
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
