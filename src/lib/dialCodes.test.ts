import { describe, expect, it } from 'vitest'
import { dialCodes, hasPhoneDigits, joinPhone, splitPhone } from './dialCodes'

describe('phone country codes', () => {
  it('uses Denmark when a number has no country code', () => {
    expect(splitPhone('33257725')).toEqual({ countryCode: 'DK', local: '33257725' })
    expect(splitPhone('')).toEqual({ countryCode: 'DK', local: '' })
  })

  it('reads the country code back from a stored number', () => {
    expect(splitPhone('+44 7700900123')).toEqual({ countryCode: 'GB', local: '7700900123' })
    expect(splitPhone('+45 33257725')).toEqual({ countryCode: 'DK', local: '33257725' })
  })

  it('keeps the typed number when the country changes', () => {
    const local = splitPhone('+45 33257725').local
    expect(joinPhone('GB', local)).toBe('+44 33257725')
  })

  it('keeps the country code when no digits are typed yet', () => {
    expect(joinPhone('GB', '')).toBe('+44')
    expect(splitPhone('+44').countryCode).toBe('GB')
  })

  it('does not count a country code alone as a phone number', () => {
    expect(hasPhoneDigits('+44')).toBe(false)
    expect(hasPhoneDigits('')).toBe(false)
    expect(hasPhoneDigits('+44 7700900123')).toBe(true)
    expect(hasPhoneDigits('33257725')).toBe(true)
  })

  it('has a country code for every country in the picker', () => {
    expect(dialCodes.length).toBeGreaterThan(180)
    expect(dialCodes.every((d) => /^\+\d{1,4}$/.test(d.dial))).toBe(true)
  })
})
