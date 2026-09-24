import 'server-only'
import { ShipmondoClient } from './client'
import { listProducts } from './products'
import { calculateCustomerPrice, totalChargeableWeight, type PricingRule } from '@/lib/shipping'
import { isDomestic, rateForWeight } from '@/lib/carrierRates'
import type { DeliveryLocation, ShipmentDraft, ShippingQuote } from '@/lib/types'
import type { ShipmondoProduct } from './types'

// Markup applied on top of Shipmondo's real quoted price (or, when a carrier can't be quoted for a
// route, on top of an interim internal estimate — see the `estimated` flag on each quote's metadata).
export const DEFAULT_PRICING_RULE: PricingRule = { percentage: 30, minimumMargin: 40, rounding: 1 }
const BASE_FEE = 75
const PER_KG_DOMESTIC = 7
const PER_KG_INTERNATIONAL = 14

const PREFERRED_PRODUCTS: Record<string, string[]> = {
  gls: ['GLSDK_HD', 'GLSDK_BP', 'GLSDK_EBP', 'GLSDK_GBP', 'GLSDK_SD'],
  pdk: ['PDK_MH', 'PDK_BP'],
  dhl_express: ['DHLE_EW', 'DHLE_ES'],
  ups: ['UPS_STANDARD', 'UPS_SAVER', 'UPS_EXPRESS'],
  bring: ['BRI_HDP', 'BRI_BP'],
  dao: ['DAO_STH', 'DAO_STS'],
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

function pickProductForCarrier(products: ShipmondoProduct[], carrierCode: string, quotedCodes: Set<string>, location: DeliveryLocation): ShipmondoProduct | undefined {
  const eligible = products.filter((p) => p.carrier.code === carrierCode && p.available)
  const candidates = location === 'service_point' ? eligible.filter((p) => p.service_point_available) : eligible.filter((p) => !p.service_point_required)
  if (!candidates.length) return undefined
  const quoted = candidates.find((c) => quotedCodes.has(c.code))
  if (quoted) return quoted
  for (const code of PREFERRED_PRODUCTS[carrierCode] ?? []) {
    const match = candidates.find((c) => c.code === code)
    if (match) return match
  }
  return candidates[0]
}

function requiredServiceCodes(product: ShipmondoProduct, draft: Pick<ShipmentDraft, 'recipient'>): string[] {
  const required = product.required_services
  if (!required.length) return []
  const isChoiceGroup = required.some((s) => Boolean(s.note))
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

export async function getLiveQuotes(draft: Pick<ShipmentDraft, 'originCountry' | 'originPostalCode' | 'destinationCountry' | 'destinationPostalCode' | 'parcels' | 'sender' | 'recipient' | 'carrierName' | 'deliveryLocation'>): Promise<ShippingQuote[]> {
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
    const product = pickProductForCarrier(products, carrierCode, quotedCodes, draft.deliveryLocation)
    if (!product) continue
    if (!matchesCarrierName(product.carrier.name, draft.carrierName)) continue
    const realQuote = rawQuotes.find((q) => q.product_code === product.code)
    const estimated = !realQuote
    // Pak & Send's own published price list is authoritative for what the customer is quoted —
    // the same price applies no matter which carrier is booked, so it takes priority over
    // Shipmondo's live /quotes/list price. Shipmondo's price (or, failing that, a generic per-kg
    // guess) only fills in for weights the published list doesn't cover (e.g. over 35 kg).
    const rateCardPrice = rateForWeight(draft.originCountry, draft.destinationCountry, draft.deliveryLocation, weight)
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
