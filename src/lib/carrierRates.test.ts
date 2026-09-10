import { describe, expect, it } from 'vitest'
import { isDomestic, maxWeightFor, rateForWeight, weightBrackets } from './carrierRates'

describe('domestic price list (POSTPAKKER DANMARK) — applied the same regardless of carrier', () => {
  it('matches the Collect (service point) weight classes', () => {
    expect(rateForWeight('DK', 'DK', 'service_point', 1)).toBe(89)
    expect(rateForWeight('DK', 'DK', 'service_point', 4.5)).toBe(98)
    expect(rateForWeight('DK', 'DK', 'service_point', 20)).toBe(198)
  })

  it('matches the Home weight classes, including the 35 kg tier Collect does not offer', () => {
    expect(rateForWeight('DK', 'DK', 'home', 1)).toBe(119)
    expect(rateForWeight('DK', 'DK', 'home', 35)).toBe(379)
    expect(rateForWeight('DK', 'DK', 'service_point', 35)).toBeUndefined()
  })

  it('exposes the right max weight per location', () => {
    expect(maxWeightFor('home')).toBe(35)
  })
})

describe('international price list (POSTPAKKER UDLAND) — zone-based, same for every carrier', () => {
  it('prices Europe 1 destinations (e.g. Germany) correctly', () => {
    expect(rateForWeight('DK', 'DE', 'home', 1)).toBe(214)
    expect(rateForWeight('DK', 'DE', 'service_point', 20)).toBe(773)
  })

  it('prices Norway/Switzerland/Liechtenstein as their own zone, not Europe 2', () => {
    expect(rateForWeight('DK', 'NO', 'home', 1)).toBe(467)
    expect(rateForWeight('DK', 'CH', 'home', 1)).toBe(467)
  })

  it('falls back to rest-of-world for an unlisted country (e.g. US)', () => {
    expect(rateForWeight('DK', 'US', 'home', 1)).toBe(511)
  })

  it('has no Home/Service point price difference internationally', () => {
    expect(rateForWeight('DK', 'DE', 'home', 5)).toBe(rateForWeight('DK', 'DE', 'service_point', 5))
  })
})

describe('isDomestic and weightBrackets', () => {
  it('treats same-country shipments as domestic', () => {
    expect(isDomestic('DK', 'DK')).toBe(true)
    expect(isDomestic('DK', 'SE')).toBe(false)
  })

  it('offers a merged, carrier-independent weight picker', () => {
    expect(weightBrackets('home')).toEqual([1, 2, 5, 10, 15, 20, 35])
    expect(weightBrackets('service_point')).toEqual([1, 2, 5, 10, 15, 20])
  })
})
