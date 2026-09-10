import { describe, expect, it } from 'vitest'
import { availableLocations, maxWeightFor, rateForWeight } from './carrierRates'

describe('carrier rate cards', () => {
  it('matches GLS ShopDelivery (service point) published weight classes', () => {
    expect(rateForWeight('GLS', 'service_point', 0.4)).toBe(34.8)
    expect(rateForWeight('GLS', 'service_point', 1)).toBe(34.8)
    expect(rateForWeight('GLS', 'service_point', 4.5)).toBe(39.8)
    expect(rateForWeight('GLS', 'service_point', 20)).toBe(96.0)
  })

  it('matches GLS PrivateDelivery (home) published weight classes', () => {
    expect(rateForWeight('GLS', 'home', 1)).toBe(59.8)
    expect(rateForWeight('GLS', 'home', 20)).toBe(119.8)
  })

  it('returns undefined once the weight exceeds the carrier max', () => {
    expect(rateForWeight('GLS', 'home', 25)).toBeUndefined()
    expect(maxWeightFor('GLS', 'home')).toBe(20)
  })

  it('exposes both delivery locations for carriers that offer both', () => {
    expect(availableLocations('Bring')).toEqual(['service_point', 'home'])
  })

  it('handles DAO sub-kilogram brackets', () => {
    expect(rateForWeight('DAO', 'service_point', 0.2)).toBe(34.8)
    expect(rateForWeight('DAO', 'service_point', 0.3)).toBe(36.6)
    expect(rateForWeight('DAO', 'home', 5)).toBe(52.51)
  })
})
