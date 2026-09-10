import 'server-only'
import { ShipmondoClient } from './client'
import type { ShipmentDraft } from '@/lib/types'
import type { CreateShipmentRequest, ShipmondoCustoms, ShipmondoLabel, ShipmondoParty, ShipmondoShipment } from './types'

function toParty(type: 'sender' | 'receiver', address: ShipmentDraft['sender']): ShipmondoParty {
  return {
    type,
    name: address.company || address.fullName,
    attention: address.fullName,
    address1: address.address1,
    address2: address.address2 || undefined,
    postal_code: address.postalCode,
    city: address.city,
    state: address.state || undefined,
    country_code: address.country,
    email: address.email,
    phone: address.phone,
  }
}

// Whether a customs object is required comes from Shipmondo's own `/products` response
// (`customs_declaration_required` on the chosen product), not from our own EU/non-EU guess or
// from contentsType — Shipmondo requires customs declarations for document shipments too
// (export_reason: 'documents'), so DOCUMENTS is not exempt.
function buildCustoms(draft: ShipmentDraft, requiresCustoms: boolean, currency = 'DKK'): ShipmondoCustoms | undefined {
  if (!requiresCustoms) return undefined
  if (draft.items.length === 0) throw new Error('Customs details (contents description, value, and commodity code) are required for this destination.')
  const missingHsCode = draft.items.find((item) => !item.hsCode || !/^\d{6}(\d{2}){0,3}$/.test(item.hsCode))
  if (missingHsCode) throw new Error(`Item "${missingHsCode.description}" is missing a valid 6/8/10/12-digit commodity (HS) code, required for customs.`)
  return {
    currency_code: currency,
    export_reason: draft.contentsType === 'DOCUMENTS' ? 'documents' : 'sale_of_goods',
    goods: draft.items.map((item) => ({
      quantity: item.quantity,
      country_code: item.originCountry,
      content: item.description,
      commodity_code: item.hsCode!,
      unit_value: item.unitValue,
      unit_weight: Math.round(item.weight * 1000),
    })),
  }
}

export function mapShipmentToShipmondo(draft: ShipmentDraft, options: { productCode: string; serviceCodes: string[]; reference: string; requiresCustoms: boolean; ownAgreement?: boolean }): CreateShipmentRequest {
  const contents = draft.contentsType === 'GOODS' ? draft.items.map((i) => i.description).filter(Boolean).join(', ') || 'Goods' : 'Documents'
  return {
    product_code: options.productCode,
    service_codes: options.serviceCodes.join(',') || undefined,
    own_agreement: options.ownAgreement ?? false,
    reference: options.reference,
    contents,
    parties: [toParty('sender', draft.sender), toParty('receiver', draft.recipient)],
    parcels: draft.parcels.map((p) => ({ weight: Math.round(p.weight * 1000), quantity: 1, length: p.length, width: p.width, height: p.height })),
    customs: buildCustoms(draft, options.requiresCustoms),
    ...(draft.deliveryLocation === 'service_point' ? { automatic_select_service_point: true } : {}),
  }
}

export async function createShipment(draft: ShipmentDraft, options: { productCode: string; serviceCodes: string[]; reference: string; requiresCustoms: boolean }): Promise<ShipmondoShipment> {
  const client = new ShipmondoClient()
  if (!client.isConfigured()) throw new Error('Shipmondo is not configured')
  const body = mapShipmentToShipmondo(draft, options)
  return client.post<ShipmondoShipment>('/shipments', body)
}

export async function getShipment(id: number): Promise<ShipmondoShipment> {
  const client = new ShipmondoClient()
  if (!client.isConfigured()) throw new Error('Shipmondo is not configured')
  return client.get<ShipmondoShipment>(`/shipments/${id}`)
}

export async function getShipmentLabels(id: number): Promise<ShipmondoLabel[]> {
  const client = new ShipmondoClient()
  if (!client.isConfigured()) throw new Error('Shipmondo is not configured')
  return client.get<ShipmondoLabel[]>(`/shipments/${id}/labels`)
}
