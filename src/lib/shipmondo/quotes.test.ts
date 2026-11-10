import { describe, expect, it } from 'vitest'
import { pickProductForCarrier, requiredServiceCodes } from './quotes'
import type { ShipmondoProduct } from './types'

// Product codes as Shipmondo's /products list returns them for Denmark (and GLS EuroBusinessParcel abroad).
function product(carrier: string, code: string, opts: { sp?: boolean; from?: string } = {}): ShipmondoProduct {
  return {
    code,
    id: 0,
    name: code,
    available: true,
    own_agreement_available: true,
    customs_declaration_required: false,
    service_point_available: opts.sp ?? false,
    service_point_required: opts.sp ?? false,
    sender_country_code: opts.from ?? 'DK',
    receiver_country_code: 'DK',
    expected_transit_time: null,
    required_fields: null,
    optional_fields: null,
    required_parcel_fields: null,
    optional_parcel_fields: null,
    carrier: { id: 0, code: carrier, name: carrier },
    available_services: [],
    required_services: [],
    weight_intervals: [],
  }
}

const DK_PRODUCTS = [
  product('pdk', 'PDK_RDO', { from: 'SE' }),
  product('pdk', 'PDK_BP'),
  product('pdk', 'PDK_MH'),
  product('pdk', 'PDK_MC', { sp: true }),
  product('gls', 'GLSDK_BP'),
  product('gls', 'GLSDK_SD', { sp: true }),
  product('gls', 'GLSDK_HD'),
  product('bring', 'BRI_BP'),
  product('bring', 'BRI_PP', { sp: true }),
  product('bring', 'BRI_HDP'),
  product('dao', 'DAO_STH'),
  product('dao', 'DAO_STS', { sp: true }),
]

const pick = (carrier: string, location: 'home' | 'service_point' | 'business', products = DK_PRODUCTS, quoted: string[] = []) =>
  pickProductForCarrier(products, carrier, new Set(quoted), location, 'DK')?.code

describe('pickProductForCarrier', () => {
  it('books the exact PostNord product for each choice', () => {
    expect(pick('pdk', 'service_point')).toBe('PDK_MC')
    expect(pick('pdk', 'home')).toBe('PDK_MH')
    expect(pick('pdk', 'business')).toBe('PDK_BP')
  })

  it('books the exact GLS product for each choice', () => {
    expect(pick('gls', 'service_point')).toBe('GLSDK_SD')
    expect(pick('gls', 'home')).toBe('GLSDK_HD')
    expect(pick('gls', 'business')).toBe('GLSDK_BP')
  })

  it('never lets a quoted business product replace Home', () => {
    expect(pick('pdk', 'home', DK_PRODUCTS, ['PDK_BP'])).toBe('PDK_MH')
    expect(pick('gls', 'home', DK_PRODUCTS, ['GLSDK_BP'])).toBe('GLSDK_HD')
  })

  it('offers only service point and home for Bring and DAO', () => {
    expect(pick('bring', 'service_point')).toBe('BRI_PP')
    expect(pick('bring', 'home')).toBe('BRI_HDP')
    expect(pick('bring', 'business')).toBeUndefined()
    expect(pick('dao', 'service_point')).toBe('DAO_STS')
    expect(pick('dao', 'home')).toBe('DAO_STH')
    expect(pick('dao', 'business')).toBeUndefined()
  })

  it('uses GLS EuroBusinessParcel for business abroad', () => {
    const abroad = [product('gls', 'GLSDK_EBP'), product('gls', 'GLSDK_HD'), product('gls', 'GLSDK_SD', { sp: true })]
    expect(pick('gls', 'business', abroad)).toBe('GLSDK_EBP')
    expect(pick('gls', 'home', abroad)).toBe('GLSDK_HD')
  })

  it('never books a business product as Home when the home product is missing', () => {
    const onlyBusiness = [product('gls', 'GLSDK_EBP'), product('gls', 'GLSDK_SD', { sp: true })]
    expect(pick('gls', 'home', onlyBusiness)).toBeUndefined()
  })

  it('never books a business parcel with a non-business product', () => {
    const noParcel = [product('pdk', 'PDK_MH'), product('pdk', 'PDK_TM')]
    expect(pick('pdk', 'business', noParcel)).toBeUndefined()
  })

  it('ignores products that start in another country', () => {
    const returnsOnly = [product('pdk', 'PDK_RDO', { from: 'SE' })]
    expect(pick('pdk', 'home', returnsOnly)).toBeUndefined()
  })
})

describe('requiredServiceCodes', () => {
  const recipient = { fullName: 'A', address1: 'B 1', postalCode: '2100', city: 'C', country: 'DK', email: 'a@b.dk', phone: '+4512345678' }
  const svc = (code: string, field: string, note: string) => ({ code, id: 0, name: code, required_fields: field, optional_fields: null, own_agreement_required: false, note })
  const ONE_TYPE = 'One type of notification must be selected'

  it('picks one notification when Shipmondo asks for one type (PostNord, Bring, DAO)', () => {
    const p = { ...product('pdk', 'PDK_MH'), required_services: [svc('EMAIL_NT', 'receiver_email', ONE_TYPE), svc('SMS_NT', 'receiver_mobile', ONE_TYPE)] }
    expect(requiredServiceCodes(p, { recipient })).toEqual(['EMAIL_NT'])
    const dao = { ...product('dao', 'DAO_STH'), required_services: [svc('EMAIL_NT', 'receiver_email', ONE_TYPE), svc('SMS_NT', 'receiver_mobile', '')] }
    expect(requiredServiceCodes(dao, { recipient })).toEqual(['EMAIL_NT'])
  })

  it('sends both SMS and e-mail notification for GLS PrivateDelivery', () => {
    const p = { ...product('gls', 'GLSDK_HD'), required_services: [svc('SMS_NT', 'receiver_mobile', ''), svc('EMAIL_NT', 'receiver_email', 'E-mail notification is required')] }
    expect(requiredServiceCodes(p, { recipient })).toEqual(['SMS_NT', 'EMAIL_NT'])
  })
})
