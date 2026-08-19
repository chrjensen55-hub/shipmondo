import 'server-only'
import { ShipmondoClient } from './client'
import { listProducts } from './products'
import { calculateCustomerPrice, totalChargeableWeight, type PricingRule } from '@/lib/shipping'
import type { ShipmentDraft, ShippingQuote } from '@/lib/types'
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
}

type RawQuote = { carrier_code: string; description: string; product_code: string; service_codes: string | null; price: number; price_before_vat: number; currency_code: string }

async function fetchRealQuotes(draft: Pick<ShipmentDraft, 'originCountry' | 'originPostalCode' | 'destinationCountry' | 'destinationPostalCode' | 'sender' | 'recipient' | 'parcels'>): Promise<RawQuote[]> {
  const client = new ShipmondoClient()
  return client.post<RawQuote[]>('/quotes/list', {
    sender: { address1: draft.sender.address1, zipcode: draft.originPostalCode, city: draft.sender.city, country_code: draft.originCountry },
    receiver: { address1: draft.recipient.address1, zipcode: draft.destinationPostalCode, city: draft.recipient.city, country_code: draft.destinationCountry },
    parcels: draft.parcels.map((p) => ({ weight: Math.round(p.weight * 1000), quantity: 1, length: p.length, width: p.width, height: p.height })),
  })
}

function pickProductForCarrier(products: ShipmondoProduct[], carrierCode: string, quotedCodes: Set<string>): ShipmondoProduct | undefined {
  const candidates = products.filter((p) => p.carrier.code === carrierCode && p.available && !p.service_point_required)
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

export async function getLiveQuotes(draft: Pick<ShipmentDraft, 'originCountry' | 'originPostalCode' | 'destinationCountry' | 'destinationPostalCode' | 'parcels' | 'sender' | 'recipient'>): Promise<ShippingQuote[]> {
  const [products, rawQuotes] = await Promise.all([
    listProducts(draft.destinationCountry),
    fetchRealQuotes(draft).catch(() => [] as RawQuote[]),
  ])
  const weight = totalChargeableWeight(draft.parcels)
  const intl = draft.destinationCountry !== draft.originCountry
  const carrierCodes = [...new Set(products.map((p) => p.carrier.code))].filter((c) => c !== 'unspecified')
  const quotedCodes = new Set(rawQuotes.map((q) => q.product_code))

  const quotes: ShippingQuote[] = []
  for (const carrierCode of carrierCodes) {
    const product = pickProductForCarrier(products, carrierCode, quotedCodes)
    if (!product) continue
    const realQuote = rawQuotes.find((q) => q.product_code === product.code)
    const estimated = !realQuote
    const purchasePrice = realQuote?.price ?? BASE_FEE + weight * (intl ? PER_KG_INTERNATIONAL : PER_KG_DOMESTIC)
    quotes.push({
      id: `${product.carrier.code}-${product.code}`,
      carrier: product.carrier.name,
      serviceName: product.name,
      productCode: product.code,
      serviceCodes: requiredServiceCodes(product, draft),
      purchasePrice: Math.round(purchasePrice * 100) / 100,
      customerPrice: calculateCustomerPrice(purchasePrice, DEFAULT_PRICING_RULE),
      currency: realQuote?.currency_code ?? 'DKK',
      estimatedDelivery: product.expected_transit_time ?? 'Contact us for delivery time',
      metadata: { source: 'shipmondo', chargeableWeight: weight, requiresCustoms: product.customs_declaration_required, estimated },
    })
  }
  return quotes.sort((a, b) => a.customerPrice - b.customerPrice)
}
