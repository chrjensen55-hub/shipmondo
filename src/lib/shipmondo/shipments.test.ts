import { describe, expect, it } from 'vitest'
import { mapShipmentToShipmondo } from './shipments'
import type { Address, ShipmentDraft } from '@/lib/types'

const address = (country: string): Address => ({ fullName: 'Test Person', address1: 'Main st 1', postalCode: '1000', city: 'Test City', country, email: 't@example.com', phone: '12345678' })

const draft = (overrides: Partial<ShipmentDraft>): ShipmentDraft => ({
  originCountry: 'DK',
  originPostalCode: '1000',
  destinationCountry: 'US',
  destinationPostalCode: '10001',
  deliveryLocation: 'home',
  sender: address('DK'),
  recipient: address('US'),
  parcels: [{ id: 'p1', weight: 1, length: 30, width: 20, height: 8 }],
  contentsType: 'DOCUMENTS',
  items: [],
  ...overrides,
})

const options = { productCode: 'X', serviceCodes: [], reference: 'ref' }

describe('customs mapping matches Shipmondo: driven by the product, not by contentsType', () => {
  it('omits customs entirely when the product does not require it', () => {
    const req = mapShipmentToShipmondo(draft({ contentsType: 'GOODS' }), { ...options, requiresCustoms: false })
    expect(req.customs).toBeUndefined()
  })

  it('still requires customs data for a DOCUMENTS shipment when the product requires it', () => {
    const d = draft({
      contentsType: 'DOCUMENTS',
      items: [{ id: 'i1', description: 'Signed contract', quantity: 1, unitValue: 0, currency: 'DKK', weight: 0.1, originCountry: 'DK', hsCode: '490700' }],
    })
    const req = mapShipmentToShipmondo(d, { ...options, requiresCustoms: true })
    expect(req.customs?.export_reason).toBe('documents')
    expect(req.customs?.goods).toHaveLength(1)
    expect(req.customs?.goods[0].commodity_code).toBe('490700')
  })

  it('throws when the product requires customs but no items were collected', () => {
    expect(() => mapShipmentToShipmondo(draft({ contentsType: 'DOCUMENTS', items: [] }), { ...options, requiresCustoms: true })).toThrow()
  })

  it('throws when the commodity code is missing or invalid', () => {
    const d = draft({
      contentsType: 'GOODS',
      items: [{ id: 'i1', description: 'T-shirt', quantity: 1, unitValue: 100, currency: 'DKK', weight: 0.2, originCountry: 'DK' }],
    })
    expect(() => mapShipmentToShipmondo(d, { ...options, requiresCustoms: true })).toThrow(/commodity/i)
  })
})

describe('service point selection', () => {
  it('requests automatic service point selection when the customer chose a pickup point', () => {
    const req = mapShipmentToShipmondo(draft({ deliveryLocation: 'service_point' }), { ...options, requiresCustoms: false })
    expect(req.automatic_select_service_point).toBe(true)
  })

  it('omits automatic service point selection for home delivery', () => {
    const req = mapShipmentToShipmondo(draft({ deliveryLocation: 'home' }), { ...options, requiresCustoms: false })
    expect(req.automatic_select_service_point).toBeUndefined()
  })
})
