import { useRouter } from 'expo-router'
import { WizardScreen } from '@/components/WizardScreen'
import { AddressForm } from '@/components/AddressForm'
import { useWizard, required } from '@/lib/wizard-context'
import { hasPhoneDigits } from '@/lib/dialCodes'
import { useLang } from '@/lib/i18n'
import type { Address } from '@/lib/types'

/* eslint-disable @typescript-eslint/no-require-imports */
const senderImage = require('../../assets/images/sender-step.png')
/* eslint-enable @typescript-eslint/no-require-imports */

export default function SenderStep() {
  const router = useRouter()
  const { draft, setDraft } = useWizard()
  const tr = useLang()

  function onChange(key: keyof Address, value: string) {
    setDraft((d) => {
      const next = { ...d, sender: { ...d.sender, [key]: value } }
      if (key === 'country') next.originCountry = value
      if (key === 'postalCode') next.originPostalCode = value
      return next
    })
  }

  const a = draft.sender
  const valid = [a.fullName, a.address1, a.postalCode, a.city, a.email].every(required) && hasPhoneDigits(a.phone)
  // Names the fields that are still empty, so a greyed-out Continue is never a puzzle.
  const missing = [
    !required(a.fullName) && tr.fullName,
    !required(a.address1) && tr.addressLine1,
    !required(a.postalCode) && tr.postalCode,
    !required(a.city) && tr.city,
    !required(a.email) && tr.email,
    !hasPhoneDigits(a.phone) && tr.mobilePhone,
  ].filter(Boolean)

  return (
    <WizardScreen
      title={tr.senderTitle}
      subtitle={tr.senderHint}
      step={4}
      icon={senderImage}
      onContinue={() => router.push('/send/recipient')}
      continueDisabled={!valid}
      continueHint={missing.length ? `${tr.missingPrefix} ${missing.join(', ')}` : undefined}
    >
      <AddressForm value={draft.sender} onChange={onChange} minimal countryLabel={tr.senderCountryLabel} />
    </WizardScreen>
  )
}
