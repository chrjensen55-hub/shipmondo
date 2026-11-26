import { useState } from 'react'
import { useRouter } from 'expo-router'
import { WizardScreen } from '@/components/WizardScreen'
import { AddressForm } from '@/components/AddressForm'
import { useWizard } from '@/lib/wizard-context'
import { addressProblems } from '@/lib/addressRules'
import { addressHint, explainError } from '@/lib/problems'
import { quotePayload } from '@/lib/payload'
import { requiresCustoms } from '@/lib/countries'
import { api } from '@/lib/api'
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

  // The same checks the server makes, so a detail it would refuse is caught before the price is asked.
  const problems = addressProblems(draft.recipient, { companyRequired: draft.deliveryLocation === 'business' })
  const valid = problems.length === 0

  async function getQuote() {
    setLoading(true)
    setError('')
    try {
      const quotes = await api<ShippingQuote[]>('/api/quotes', { method: 'POST', body: JSON.stringify(quotePayload(draft)) })
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
      // Always says why: which field the server could not accept, or that there is no connection.
      setError(explainError(err, tr, tr.quoteFetchError))
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
      continueHint={addressHint(problems, tr)}
      error={error}
    >
      <AddressForm
        value={draft.recipient}
        onChange={onChange}
        noEmail={noEmail}
        onToggleNoEmail={toggleNoEmail}
        noPhone={noPhone}
        onToggleNoPhone={toggleNoPhone}
        countryLabel={tr.recipientCountryLabel}
        companyRequired={draft.deliveryLocation === 'business'}
      />
    </WizardScreen>
  )
}
