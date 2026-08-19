export type ShipmondoPartyType = 'sender' | 'receiver' | 'pickup' | 'importer' | 'freight_payer' | 'service_point' | 'return'

export type ShipmondoParty = {
  type: ShipmondoPartyType
  name: string
  attention?: string
  address1: string
  address2?: string
  postal_code: string
  city: string
  state?: string
  country_code: string
  email?: string
  phone?: string
  attributes?: { name: string; value: string }[]
}

export type ShipmondoParcel = {
  weight: number
  quantity?: number
  length?: number
  width?: number
  height?: number
  package_type?: string
  content?: string
}

export type ShipmondoCustomsGood = {
  quantity: number
  country_code: string
  content: string
  commodity_code: string
  unit_value: number
  unit_weight: number
}

export type ShipmondoCustoms = {
  currency_code: string
  export_reason?: 'gift' | 'documents' | 'commercial_samples' | 'returned_goods' | 'other' | 'sale_of_goods'
  term_of_trade?: string
  goods: ShipmondoCustomsGood[]
}

export type CreateShipmentRequest = {
  product_code: string
  service_codes?: string
  own_agreement: boolean
  reference?: string
  contents?: string
  parties: ShipmondoParty[]
  parcels: ShipmondoParcel[]
  customs?: ShipmondoCustoms
  service_point_id?: string
  automatic_select_service_point?: boolean
  print?: boolean
  print_at?: { host_name: string; printer_name: string; label_format: string }
}

export type ShipmondoShipment = {
  id: number
  created_at: string
  updated_at: string
  carrier_code: string
  description: string
  product_code: string
  service_codes: string
  price: string
  reference: string | null
  pkg_no: string
  external_pkg_no: string | null
  parties: ShipmondoParty[]
  parcels: (ShipmondoParcel & { pkg_no?: string; pkg_nos?: string[] })[]
  customs: ShipmondoCustoms | null
}

export type ShipmondoLabel = { base64: string; file_format: string }

export type ShipmondoPrinter = { name: string; hostName: string; printerName: string; labelFormat: string }

export type ShipmondoProductService = {
  code: string
  id: number
  name: string
  required_fields: string | null
  optional_fields: string | null
  own_agreement_required: boolean
  note?: string
}

export type ShipmondoProduct = {
  code: string
  id: number
  name: string
  available: boolean
  own_agreement_available: boolean
  customs_declaration_required: boolean
  service_point_available: boolean
  service_point_required: boolean
  sender_country_code: string
  receiver_country_code: string
  expected_transit_time: string | null
  required_fields: string | null
  optional_fields: string | null
  required_parcel_fields: string | null
  optional_parcel_fields: string | null
  carrier: { id: number; code: string; name: string }
  available_services: ShipmondoProductService[]
  required_services: ShipmondoProductService[]
  weight_intervals: { from_weight: number; to_weight: number; description: string }[]
}

export type ShipmondoAccount = {
  name: string
  address_1: string
  address_2: string | null
  zip_code: string
  city: string
  country_code: string
  phone: string | null
  email: string | null
  vat_no: string | null
}

export type ShipmentBookingResult = { shipmentId: string; trackingNumber: string; purchasePrice: number; currency: string; metadata?: Record<string, unknown> }

export class ShipmondoApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ShipmondoApiError'
    this.status = status
  }
}
