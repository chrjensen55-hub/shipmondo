import { useState } from 'react'
import { useRouter } from 'expo-router'
import { WizardScreen } from '@/components/WizardScreen'
import { AddressForm } from '@/components/AddressForm'
import { useWizard, required } from '@/lib/wizard-context'
import { requiresCustoms } from '@/lib/countries'
import { api, ApiError } from '@/lib/api'
import type { Address, ShippingQuote } from '@/lib/types'

export default function RecipientStep() {
  const router = useRouter()
  const { draft, setDraft, setQuotes, setNeedsCustoms } = useWizard()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function onChange(key: keyof Address, value: string) {
    setDraft((d) => {
      const next = { ...d, recipient: { ...d.recipient, [key]: value } }
      if (key === 'country') next.destinationCountry = value
      if (key === 'postalCode') next.destinationPostalCode = value
      return next
    })
  }

  const a = draft.recipient
  const valid = [a.fullName, a.address1, a.postalCode, a.city, a.email, a.phone].every(required)

  async function getQuote() {
    setLoading(true)
    setError('')
    try {
      const quotes = await api<ShippingQuote[]>('/api/quotes', { method: 'POST', body: JSON.stringify(draft) })
      if (!quotes.length) {
        setError(`${draft.carrierName} does not deliver on this route.`)
        return
      }
      setQuotes(quotes)
      setDraft((d) => ({ ...d, selectedQuoteId: quotes[0].id }))
      const customsRequired = quotes[0].metadata.requiresCustoms ?? requiresCustoms(draft.originCountry, draft.destinationCountry)
      setNeedsCustoms(customsRequired)
      router.push(customsRequired ? '/send/customs' : '/send/review')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not fetch a rate. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <WizardScreen title="Who is receiving the parcel?" step={5} onContinue={getQuote} continueLabel={loading ? 'Checking rate…' : 'Continue'} continueDisabled={!valid || loading} continueLoading={loading} error={error}>
      <AddressForm value={draft.recipient} onChange={onChange} />
    </WizardScreen>
  )
}
