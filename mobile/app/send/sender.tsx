import { useRouter } from 'expo-router'
import { WizardScreen } from '@/components/WizardScreen'
import { AddressForm } from '@/components/AddressForm'
import { useWizard, required } from '@/lib/wizard-context'
import { hasPhoneDigits } from '@/lib/dialCodes'
import { useLang } from '@/lib/i18n'
import type { Address } from '@/lib/types'

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

  return (
    <WizardScreen title={tr.senderTitle} step={4} onContinue={() => router.push('/send/recipient')} continueDisabled={!valid}>
      <AddressForm value={draft.sender} onChange={onChange} minimal />
    </WizardScreen>
  )
}
