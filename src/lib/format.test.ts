import { describe, expect, it } from 'vitest'
import { formatDateTime, formatLongDate, formatPrice } from './format'

describe('formatPrice', () => {
  it('shows whole kroner without decimals', () => {
    expect(formatPrice('119.0')).toBe('119')
    expect(formatPrice('65')).toBe('65')
  })

  it('keeps two decimals for other amounts', () => {
    expect(formatPrice('119.5')).toBe('119.50')
  })

  it('leaves text that is not a number as it is', () => {
    expect(formatPrice('n/a')).toBe('n/a')
  })
})

describe('dates', () => {
  it('writes date and time in Danish time, the same on server and browser', () => {
    // 14:33 UTC is 15:33 in Copenhagen in November.
    expect(formatDateTime('2026-11-10T14:33:33Z')).toBe('10 Nov 2026, 15:33')
  })

  it('returns the text unchanged when it is not a date', () => {
    expect(formatDateTime('not a date')).toBe('not a date')
  })

  it('writes the long date with the weekday', () => {
    expect(formatLongDate(new Date('2026-11-18T10:00:00Z'))).toBe('Wednesday, 18 November 2026')
  })
})
