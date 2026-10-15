import { useState } from 'react'
import { useRouter } from 'expo-router'
import { WizardScreen } from '@/components/WizardScreen'
import { AddressForm } from '@/components/AddressForm'
import { useWizard, required } from '@/lib/wizard-context'
import { hasPhoneDigits } from '@/lib/dialCodes'
import { requiresCustoms } from '@/lib/countries'
import { api, ApiError } from '@/lib/api'
import { useLang } from '@/lib/i18n'
import type { Address, ShippingQuote } from '@/lib/types'

/* eslint-disable @typescript-eslint/no-require-imports */
const recipientImage = require('../../assets/images/recipient-step.png')
/* eslint-enable @typescript-eslint/no-require-imports */

export default function RecipientStep() {
  const router = useRouter()
  const { draft, setDraft, setQuotes, setNeedsCustoms } = useWizard()
  const tr = useLang()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [noEmail, setNoEmail] = useState(false)
  const [noPhone, setNoPhone] = useState(false)

  function onChange(key: keyof Address, value: string) {
    setDraft((d) => {
      const next = { ...d, recipient: { ...d.recipient, [key]: value } }
      if (key === 'country') next.destinationCountry = value
      if (key === 'postalCode') next.destinationPostalCode = value
      return next
    })
  }

  function toggleNoEmail(checked: boolean) {
    setNoEmail(checked)
    setDraft((d) => ({ ...d, recipient: { ...d.recipient, email: checked ? d.sender.email : '' } }))
  }

  function toggleNoPhone(checked: boolean) {
    setNoPhone(checked)
    setDraft((d) => ({ ...d, recipient: { ...d.recipient, phone: checked ? d.sender.phone : '' } }))
  }

  const a = draft.recipient
  const valid = [a.fullName, a.address1, a.postalCode, a.city, a.email].every(required) && hasPhoneDigits(a.phone)

  async function getQuote() {
    setLoading(true)
    setError('')
    try {
      const quotes = await api<ShippingQuote[]>('/api/quotes', { method: 'POST', body: JSON.stringify(draft) })
      if (!quotes.length) {
        setError(`${draft.carrierName} ${tr.doesNotDeliverSuffix}`)
        return
      }
      setQuotes(quotes)
      setDraft((d) => ({ ...d, selectedQuoteId: quotes[0].id }))
      const customsRequired = quotes[0].metadata.requiresCustoms ?? requiresCustoms(draft.originCountry, draft.destinationCountry)
      setNeedsCustoms(customsRequired)
      router.push(customsRequired ? '/send/customs' : '/send/review')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr.quoteFetchError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <WizardScreen title={tr.recipientTitle} subtitle={tr.recipientHint} step={5} icon={recipientImage} onContinue={getQuote} continueLabel={loading ? tr.checkingRate : tr.continueAction} continueDisabled={!valid || loading} continueLoading={loading} error={error}>
      <AddressForm value={draft.recipient} onChange={onChange} noEmail={noEmail} onToggleNoEmail={toggleNoEmail} noPhone={noPhone} onToggleNoPhone={toggleNoPhone} />
    </WizardScreen>
  )
}
