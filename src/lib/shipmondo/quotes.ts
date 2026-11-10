import 'server-only'
import { ShipmondoClient } from './client'
import { listProducts } from './products'
import { calculateCustomerPrice, totalChargeableWeight, type PricingRule } from '@/lib/shipping'
import { isDomestic, rateForWeight } from '@/lib/carrierRates'
import { REGISTERED_LETTER_PRICE, REGISTERED_LETTER_PRODUCT_CODE, registeredLetterError } from '@/lib/registeredLetter'
import type { DeliveryLocation, ShipmentDraft, ShippingQuote } from '@/lib/types'
import type { ShipmondoProduct } from './types'

// Markup applied on top of Shipmondo's real quoted price (or, when a carrier can't be quoted for a
// route, on top of an interim internal estimate — see the `estimated` flag on each quote's metadata).
export const DEFAULT_PRICING_RULE: PricingRule = { percentage: 30, minimumMargin: 40, rounding: 1 }
const BASE_FEE = 75
const PER_KG_DOMESTIC = 7
const PER_KG_INTERNATIONAL = 14

const PREFERRED_PRODUCTS: Record<string, string[]> = {
  dhl_express: ['DHLE_EW', 'DHLE_ES'],
  ups: ['UPS_STANDARD', 'UPS_SAVER', 'UPS_EXPRESS'],
}

// The exact Shipmondo product for each delivery choice in the wizard (codes from Shipmondo's
// /products list): Service point books the service point product, Home the home product and
// Business (erhverv) the business product, never one in place of another. GLS business abroad is
// EuroBusinessParcel (GLSDK_EBP); GLSDK_BP is Denmark only. Bring and DAO have no business choice.
export const PRODUCTS_BY_DELIVERY: Record<string, Partial<Record<DeliveryLocation, string[]>>> = {
  pdk: { service_point: ['PDK_MC'], home: ['PDK_MH'], business: ['PDK_BP'] },
  gls: { service_point: ['GLSDK_SD'], home: ['GLSDK_HD'], business: ['GLSDK_BP', 'GLSDK_EBP'] },
  bring: { service_point: ['BRI_PP'], home: ['BRI_HDP'] },
  dao: { service_point: ['DAO_STS'], home: ['DAO_STH'] },
}

// DAO_H and DAO_P (the "(pickup)" products the regular /products endpoint returns) are never
// bookable on this account: Shipmondo's own_agreement_available:false for both, yet the booking
// API rejects them without an agreement too — confirmed with Shipmondo support, this account's
// DAO agreement (customer number 218779) is only registered against the "drop-off" products
// DAO_STH/DAO_STS instead. Those two don't appear in /products at all (only in the slower,
// async carrier setup file — see /api/setups/carriers), so they're hardcoded here from that
// file's real response rather than polling it on every quote request. Domestic (DK->DK) only,
// the one route confirmed configured; DAO_R (returns) is unaffected and keeps coming from
// /products as before.
const DAO_DOMESTIC_DROPOFF_PRODUCTS: ShipmondoProduct[] = [
  {
    code: 'DAO_STH',
    id: 0,
    name: 'daoHOME (drop-off)',
    available: true,
    own_agreement_available: true,
    customs_declaration_required: false,
    service_point_available: false,
    service_point_required: false,
    sender_country_code: 'DK',
    receiver_country_code: 'DK',
    expected_transit_time: null,
    required_fields: null,
    optional_fields: null,
    required_parcel_fields: null,
    optional_parcel_fields: null,
    carrier: { id: 8, code: 'dao', name: 'dao' },
    available_services: [],
    required_services: [
      { code: 'EMAIL_NT', id: 17, name: 'E-mail notification', required_fields: 'receiver_email', optional_fields: null, own_agreement_required: false, note: 'One type of notification must be selected' },
      { code: 'SMS_NT', id: 18, name: 'SMS notification', required_fields: 'receiver_mobile', optional_fields: null, own_agreement_required: false, note: '' },
    ],
    weight_intervals: [],
  },
  {
    code: 'DAO_STS',
    id: 0,
    name: 'daoSHOP (drop-off)',
    available: true,
    own_agreement_available: true,
    customs_declaration_required: false,
    service_point_available: true,
    service_point_required: true,
    sender_country_code: 'DK',
    receiver_country_code: 'DK',
    expected_transit_time: null,
    required_fields: null,
    optional_fields: null,
    required_parcel_fields: null,
    optional_parcel_fields: null,
    carrier: { id: 8, code: 'dao', name: 'dao' },
    available_services: [],
    required_services: [
      { code: 'EMAIL_NT', id: 17, name: 'E-mail notification', required_fields: 'receiver_email', optional_fields: null, own_agreement_required: false, note: 'One type of notification must be selected' },
      { code: 'SMS_NT', id: 18, name: 'SMS notification', required_fields: 'receiver_mobile', optional_fields: null, own_agreement_required: false, note: '' },
    ],
    weight_intervals: [],
  },
]

type RawQuote = { carrier_code: string; description: string; product_code: string; service_codes: string | null; price: number; price_before_vat: number; currency_code: string }

async function fetchRealQuotes(draft: Pick<ShipmentDraft, 'originCountry' | 'originPostalCode' | 'destinationCountry' | 'destinationPostalCode' | 'sender' | 'recipient' | 'parcels'>): Promise<RawQuote[]> {
  const client = await ShipmondoClient.create()
  return client.post<RawQuote[]>('/quotes/list', {
    sender: { address1: draft.sender.address1, zipcode: draft.originPostalCode, city: draft.sender.city, country_code: draft.originCountry },
    receiver: { address1: draft.recipient.address1, zipcode: draft.destinationPostalCode, city: draft.recipient.city, country_code: draft.destinationCountry },
    parcels: draft.parcels.map((p) => ({ weight: Math.round(p.weight * 1000), quantity: 1, length: p.length, width: p.width, height: p.height })),
  })
}

export function pickProductForCarrier(products: ShipmondoProduct[], carrierCode: string, quotedCodes: Set<string>, location: DeliveryLocation, originCountry?: string): ShipmondoProduct | undefined {
  // /products also lists products that start abroad (e.g. returns into Denmark); only ones sent from the sender's country count.
  const eligible = products.filter((p) => p.carrier.code === carrierCode && p.available && (!originCountry || !p.sender_country_code || p.sender_country_code === originCountry))
  const mapped = PRODUCTS_BY_DELIVERY[carrierCode]
  if (mapped) {
    for (const code of mapped[location] ?? []) {
      const match = eligible.find((p) => p.code === code)
      if (match) return match
    }
    // A carrier with no product for this choice (e.g. Bring/DAO business) gets no quote, and
    // Business only ever books a real business product.
    if (!mapped[location] || location === 'business') return undefined
  }
  // Route without the usual product (e.g. some countries abroad): fall back to a matching product,
  // but never one that belongs to another delivery choice, so Home never books a business parcel.
  const otherChoiceCodes = new Set(Object.entries(mapped ?? {}).filter(([key]) => key !== location).flatMap(([, codes]) => codes ?? []))
  const pool = eligible.filter((p) => !otherChoiceCodes.has(p.code))
  const candidates = location === 'service_point' ? pool.filter((p) => p.service_point_available) : pool.filter((p) => !p.service_point_required)
  if (!candidates.length) return undefined
  const quoted = candidates.find((c) => quotedCodes.has(c.code))
  if (quoted) return quoted
  for (const code of PREFERRED_PRODUCTS[carrierCode] ?? []) {
    const match = candidates.find((c) => c.code === code)
    if (match) return match
  }
  return candidates[0]
}

export function requiredServiceCodes(product: ShipmondoProduct, draft: Pick<ShipmentDraft, 'recipient'>): string[] {
  const required = product.required_services
  if (!required.length) return []
  // Shipmondo marks a pick-one group with the note "One type of notification must be selected".
  // Other notes (e.g. GLS "E-mail notification is required") mean every listed service is needed:
  // GLS PrivateDelivery (GLSDK_HD) needs both SMS_NT and EMAIL_NT.
  const isChoiceGroup = required.some((s) => /one type/i.test(s.note ?? ''))
  if (isChoiceGroup) {
    const emailOption = required.find((s) => s.required_fields?.includes('receiver_email'))
    if (emailOption && draft.recipient.email) return [emailOption.code]
    const mobileOption = required.find((s) => s.required_fields?.includes('receiver_mobile'))
    if (mobileOption && draft.recipient.phone) return [mobileOption.code]
    return [required[0].code]
  }
  return required.map((s) => s.code)
}

function matchesCarrierName(productCarrierName: string, wanted?: string): boolean {
  if (!wanted) return true
  const a = productCarrierName.toLowerCase()
  const b = wanted.toLowerCase()
  return a.includes(b) || b.includes(a)
}

// Registered letter: Shipmondo prices and books PDK_RE itself, so we only pass the product on. The
// customer-facing price is the flat registered-letter price.
async function registeredLetterQuote(draft: Pick<ShipmentDraft, 'destinationCountry' | 'parcels' | 'recipient'>): Promise<ShippingQuote[]> {
  // The product list is only used for details; Shipmondo itself decides whether the letter can be
  // booked, and its own error is shown if it refuses, so a missing/odd list entry never blocks it.
  const letter = await listProducts(draft.destinationCountry, REGISTERED_LETTER_PRODUCT_CODE)
    .then((products) => products.find((p) => p.code === REGISTERED_LETTER_PRODUCT_CODE))
    .catch(() => undefined)
  return [
    {
      id: `pdk-${REGISTERED_LETTER_PRODUCT_CODE}`,
      carrier: letter?.carrier.name ?? 'PostNord (DK)',
      serviceName: letter?.name ?? 'Registered',
      productCode: REGISTERED_LETTER_PRODUCT_CODE,
      serviceCodes: letter ? requiredServiceCodes(letter, draft) : [],
      purchasePrice: REGISTERED_LETTER_PRICE,
      customerPrice: REGISTERED_LETTER_PRICE,
      currency: 'DKK',
      estimatedDelivery: letter?.expected_transit_time ?? 'Contact us for delivery time',
      // PDK_RE is documents-only: no customs declaration is required or sent.
      metadata: { source: 'shipmondo', chargeableWeight: draft.parcels.reduce((n, p) => n + p.weight, 0), requiresCustoms: false, estimated: false, ownAgreement: letter?.own_agreement_available ?? true },
    },
  ]
}

export async function getLiveQuotes(draft: Pick<ShipmentDraft, 'originCountry' | 'originPostalCode' | 'destinationCountry' | 'destinationPostalCode' | 'parcels' | 'sender' | 'recipient' | 'carrierName' | 'deliveryLocation' | 'locationRates' | 'registeredLetter'>): Promise<ShippingQuote[]> {
  if (draft.registeredLetter) {
    const invalid = registeredLetterError(draft)
    if (invalid) throw new Error(invalid)
    return registeredLetterQuote(draft)
  }
  const [rawProducts, rawQuotes] = await Promise.all([
    listProducts(draft.destinationCountry),
    fetchRealQuotes(draft).catch(() => [] as RawQuote[]),
  ])
  const domesticDaoRoute = draft.originCountry === 'DK' && draft.destinationCountry === 'DK'
  const products = rawProducts
    .filter((p) => !(p.carrier.code === 'dao' && (p.code === 'DAO_H' || p.code === 'DAO_P')))
    .concat(domesticDaoRoute ? DAO_DOMESTIC_DROPOFF_PRODUCTS : [])
  const weight = totalChargeableWeight(draft.parcels)
  const intl = draft.destinationCountry !== draft.originCountry
  const carrierCodes = [...new Set(products.map((p) => p.carrier.code))].filter((c) => c !== 'unspecified')
  const quotedCodes = new Set(rawQuotes.map((q) => q.product_code))

  const quotes: ShippingQuote[] = []
  for (const carrierCode of carrierCodes) {
    const product = pickProductForCarrier(products, carrierCode, quotedCodes, draft.deliveryLocation, draft.originCountry)
    if (!product) continue
    if (!matchesCarrierName(product.carrier.name, draft.carrierName)) continue
    const realQuote = rawQuotes.find((q) => q.product_code === product.code)
    const estimated = !realQuote
    // Pak & Send's own published price list is authoritative for what the customer is quoted —
    // the same price applies no matter which carrier is booked, so it takes priority over
    // Shipmondo's live /quotes/list price. Shipmondo's price (or, failing that, a generic per-kg
    // guess) only fills in for weights the published list doesn't cover (e.g. over 35 kg).
    const rateCardPrice = rateForWeight(draft.originCountry, draft.destinationCountry, draft.deliveryLocation, weight, draft.locationRates)
    const purchasePrice = rateCardPrice ?? realQuote?.price ?? BASE_FEE + weight * (intl ? PER_KG_INTERNATIONAL : PER_KG_DOMESTIC)
    // Domestic price-list rates are charged to the customer exactly as published, with no markup.
    const domestic = isDomestic(draft.originCountry, draft.destinationCountry)
    const customerPrice = domestic && rateCardPrice !== undefined ? rateCardPrice : calculateCustomerPrice(purchasePrice, DEFAULT_PRICING_RULE)
    quotes.push({
      id: `${product.carrier.code}-${product.code}`,
      carrier: product.carrier.name,
      serviceName: product.name,
      productCode: product.code,
      serviceCodes: requiredServiceCodes(product, draft),
      purchasePrice: Math.round(purchasePrice * 100) / 100,
      customerPrice,
      currency: realQuote?.currency_code ?? 'DKK',
      estimatedDelivery: product.expected_transit_time ?? 'Contact us for delivery time',
      metadata: { source: 'shipmondo', chargeableWeight: weight, requiresCustoms: product.customs_declaration_required, estimated, ownAgreement: product.own_agreement_available },
    })
  }
  return quotes.sort((a, b) => a.customerPrice - b.customerPrice)
}
