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
  const letterInDenmark = !!draft.registeredLetter && a.country === 'DK'
  const business = draft.deliveryLocation === 'business'
  const valid = [a.fullName, a.address1, a.postalCode, a.city, a.email, ...(business ? [a.company ?? ''] : [])].every(required) && hasPhoneDigits(a.phone) && !letterInDenmark
  // Names the fields that are still empty, so a greyed-out Continue is never a puzzle.
  const missing = [
    !required(a.fullName) && tr.fullName,
    business && !required(a.company ?? '') && tr.company,
    !required(a.address1) && tr.addressLine1,
    !required(a.postalCode) && tr.postalCode,
    !required(a.city) && tr.city,
    !required(a.email) && tr.email,
    !hasPhoneDigits(a.phone) && tr.mobilePhone,
  ].filter(Boolean)

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
    <WizardScreen
      title={tr.recipientTitle}
      subtitle={tr.recipientHint}
      step={5}
      icon={recipientImage}
      onContinue={getQuote}
      continueLabel={loading ? tr.checkingRate : tr.continueAction}
      continueDisabled={!valid || loading}
      continueLoading={loading}
      continueHint={missing.length ? `${tr.missingPrefix} ${missing.join(', ')}` : undefined}
      error={error}
    >
      <AddressForm
        value={draft.recipient}
        onChange={onChange}
        noEmail={noEmail}
        onToggleNoEmail={toggleNoEmail}
        noPhone={noPhone}
        onToggleNoPhone={toggleNoPhone}
        countryError={letterInDenmark ? tr.letterDenmarkError : undefined}
        countryLabel={tr.recipientCountryLabel}
        companyRequired={business}
      />
    </WizardScreen>
  )
}
