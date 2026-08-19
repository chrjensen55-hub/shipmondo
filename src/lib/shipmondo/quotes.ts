import 'server-only'
import { listProducts } from './products'
import { calculateCustomerPrice, totalChargeableWeight, type PricingRule } from '@/lib/shipping'
import type { ShipmentDraft, ShippingQuote } from '@/lib/types'
import type { ShipmondoProduct } from './types'

// Interim internal pricing until the admin pricing screens are configured with real carrier rate cards.
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

function pickProductForCarrier(products: ShipmondoProduct[], carrierCode: string): ShipmondoProduct | undefined {
  const candidates = products.filter((p) => p.carrier.code === carrierCode && p.available && !p.service_point_required)
  if (!candidates.length) return undefined
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

export async function getLiveQuotes(draft: Pick<ShipmentDraft, 'originCountry' | 'destinationCountry' | 'parcels' | 'recipient'>): Promise<ShippingQuote[]> {
  const products = await listProducts(draft.destinationCountry)
  const weight = totalChargeableWeight(draft.parcels)
  const intl = draft.destinationCountry !== draft.originCountry
  const carrierCodes = [...new Set(products.map((p) => p.carrier.code))].filter((c) => c !== 'unspecified')

  const quotes: ShippingQuote[] = []
  for (const carrierCode of carrierCodes) {
    const product = pickProductForCarrier(products, carrierCode)
    if (!product) continue
    const purchasePrice = BASE_FEE + weight * (intl ? PER_KG_INTERNATIONAL : PER_KG_DOMESTIC)
    quotes.push({
      id: `${product.carrier.code}-${product.code}`,
      carrier: product.carrier.name,
      serviceName: product.name,
      productCode: product.code,
      serviceCodes: requiredServiceCodes(product, draft),
      purchasePrice: Math.round(purchasePrice),
      customerPrice: calculateCustomerPrice(purchasePrice, DEFAULT_PRICING_RULE),
      currency: 'DKK',
      estimatedDelivery: product.expected_transit_time ?? 'Contact us for delivery time',
      metadata: { source: 'shipmondo', chargeableWeight: weight, requiresCustoms: product.customs_declaration_required },
    })
  }
  return quotes.sort((a, b) => a.customerPrice - b.customerPrice)
}
