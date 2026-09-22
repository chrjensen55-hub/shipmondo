import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Address, DeliveryLocation, ShipmentDraft, ShippingQuote } from './types'
import { boxSizeFor, weightBrackets } from './carrierRates'

export const CARRIERS = [
  { name: 'DAO', tagline: 'Fast Danish parcel delivery' },
  { name: 'Bring', tagline: 'Flexible Nordic delivery' },
  { name: 'PostNord', tagline: 'Nordic parcel specialist' },
  { name: 'GLS', tagline: 'Affordable European parcels' },
] as const

export const SERVICE_POINT_LABEL: Record<string, string> = { GLS: 'GLS PakkeShop', DAO: 'daoSHOP', PostNord: 'PostNord Service Point', Bring: 'Bring pickup point' }
export const HS_CODE_RE = /^\d{6}(\d{2}){0,3}$/

const blankAddress = (country = 'DK'): Address => ({ fullName: '', company: '', address1: '', address2: '', postalCode: '', city: '', country, email: '', phone: '' })

export function firstParcelSize(location: DeliveryLocation) {
  const brackets = weightBrackets(location)
  const first = brackets[0]
  return first !== undefined ? { weight: first, ...boxSizeFor(first) } : { weight: 1, length: 30, width: 20, height: 8 }
}

function initialDraft(): ShipmentDraft {
  return {
    originCountry: 'DK',
    originPostalCode: '',
    destinationCountry: 'DK',
    destinationPostalCode: '',
    carrierName: undefined,
    deliveryLocation: 'home',
    sender: blankAddress(),
    recipient: blankAddress('DK'),
    parcels: [{ id: 'parcel-1', ...firstParcelSize('home') }],
    contentsType: 'GOODS',
    items: [],
  }
}

type WizardContextValue = {
  draft: ShipmentDraft
  setDraft: React.Dispatch<React.SetStateAction<ShipmentDraft>>
  quotes: ShippingQuote[]
  setQuotes: React.Dispatch<React.SetStateAction<ShippingQuote[]>>
  needsCustoms: boolean
  setNeedsCustoms: React.Dispatch<React.SetStateAction<boolean>>
  reset: () => void
}

const WizardContext = createContext<WizardContextValue | null>(null)

export function WizardProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<ShipmentDraft>(initialDraft)
  const [quotes, setQuotes] = useState<ShippingQuote[]>([])
  const [needsCustoms, setNeedsCustoms] = useState(false)
  function reset() {
    setDraft(initialDraft())
    setQuotes([])
    setNeedsCustoms(false)
  }
  return <WizardContext.Provider value={{ draft, setDraft, quotes, setQuotes, needsCustoms, setNeedsCustoms, reset }}>{children}</WizardContext.Provider>
}

export function useWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used within WizardProvider')
  return ctx
}

export const required = (value: string) => value.trim().length > 1
