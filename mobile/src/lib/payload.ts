import type { Address, ShipmentDraft } from './types'

// What is sent to the server for a price and for a booking. Only what that request needs goes
// along, with spaces at the ends removed, so nothing left over from an earlier try (a customs
// line from a parcel that was first going abroad, for example) can make the server refuse it.

const tidy = (value: string | undefined) => (value ?? '').trim()

function tidyAddress(address: Address): Address {
  return {
    ...address,
    fullName: tidy(address.fullName),
    company: tidy(address.company),
    address1: tidy(address.address1),
    address2: tidy(address.address2),
    postalCode: tidy(address.postalCode),
    city: tidy(address.city),
    email: tidy(address.email),
    phone: tidy(address.phone),
  }
}

// A price depends on the route, the parcels and the two addresses. Customs lines play no part.
export function quotePayload(draft: ShipmentDraft) {
  return {
    originCountry: draft.originCountry,
    originPostalCode: tidy(draft.originPostalCode),
    destinationCountry: draft.destinationCountry,
    destinationPostalCode: tidy(draft.destinationPostalCode),
    carrierName: draft.carrierName,
    deliveryLocation: draft.deliveryLocation,
    sender: tidyAddress(draft.sender),
    recipient: tidyAddress(draft.recipient),
    parcels: draft.parcels,
    locationRates: draft.locationRates,
  }
}

// A booking adds the chosen price. Customs lines go along only when this parcel needs them.
export function bookingPayload(draft: ShipmentDraft, needsCustoms: boolean, idempotencyKey: string) {
  return {
    ...quotePayload(draft),
    contentsType: draft.contentsType,
    selectedQuoteId: draft.selectedQuoteId,
    items: needsCustoms ? draft.items : [],
    ...(needsCustoms && draft.exportReason ? { exportReason: draft.exportReason } : {}),
    confirmation: true as const,
    idempotencyKey,
  }
}
