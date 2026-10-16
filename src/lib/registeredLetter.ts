import type { ShipmentDraft } from './types'

// PostNord "Rekommanderet brev" (Registered letter). Shipmondo product code per their product news
// (shipmondo.com/product-news/postnord-changes-to-product-structure-and-naming): PDK_RE is for
// documents only (since 2 May 2025) and takes no customs object / INCLUDE_CNN22 service.
export const REGISTERED_LETTER_PRODUCT_CODE = 'PDK_RE'
export const REGISTERED_LETTER_CARRIER = 'PostNord'
export const REGISTERED_LETTER_PRICE = 295
export const REGISTERED_LETTER_MAX_KG = 2

export function registeredLetterError(draft: Pick<ShipmentDraft, 'registeredLetter' | 'carrierName' | 'originCountry' | 'destinationCountry' | 'parcels'>): string | null {
  if (!draft.registeredLetter) return null
  if (draft.carrierName !== REGISTERED_LETTER_CARRIER) return 'Registered letters can only be sent with PostNord.'
  if (draft.destinationCountry === 'DK') return 'PostNord does not send registered letters within Denmark. Please choose another country.'
  const weight = draft.parcels.reduce((sum, p) => sum + p.weight, 0)
  if (weight > REGISTERED_LETTER_MAX_KG) return `A registered letter can weigh at most ${REGISTERED_LETTER_MAX_KG} kg.`
  return null
}
