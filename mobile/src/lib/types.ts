// Mirrors the relevant subset of src/lib/shipmondo/types.ts (ShipmondoShipment) in the web app's
// backend — this app is a client for that same API, not a second copy of the backend's types.
export type ShipmondoParty = {
  type: 'sender' | 'receiver'
  name: string
  address1: string
  postal_code: string
  city: string
  country_code: string
}

export type ShipmondoShipment = {
  id: number
  created_at: string
  carrier_code: string
  description: string
  price: string
  reference: string | null
  pkg_no: string
  external_pkg_no: string | null
  parties: ShipmondoParty[]
}

export type Address = { fullName: string; company?: string; address1: string; address2?: string; postalCode: string; city: string; country: string; state?: string; email: string; phone: string; instructions?: string }
export type Parcel = { id: string; weight: number; length: number; width: number; height: number }
export type DeliveryLocation = 'home' | 'service_point'
export type ShipmentItem = { id: string; description: string; quantity: number; unitValue: number; currency: string; weight: number; originCountry: string; hsCode?: string }
export type ShipmentDraft = {
  originCountry: string
  originPostalCode: string
  destinationCountry: string
  destinationPostalCode: string
  carrierName?: string
  deliveryLocation: DeliveryLocation
  sender: Address
  recipient: Address
  parcels: Parcel[]
  contentsType: 'DOCUMENTS' | 'GOODS'
  items: ShipmentItem[]
  exportReason?: string
  selectedQuoteId?: string
}

export type ShippingQuote = {
  id: string
  carrier: string
  serviceName: string
  productCode: string
  serviceCodes: string[]
  purchasePrice: number
  customerPrice: number
  currency: string
  estimatedDelivery: string
  metadata: { source: 'mock' | 'shipmondo'; chargeableWeight: number; requiresCustoms?: boolean; estimated?: boolean; ownAgreement?: boolean }
}
