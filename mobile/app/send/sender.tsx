import { useRouter } from 'expo-router'
import { WizardScreen } from '@/components/WizardScreen'
import { AddressForm } from '@/components/AddressForm'
import { useWizard, required } from '@/lib/wizard-context'
import type { Address } from '@/lib/types'

export default function SenderStep() {
  const router = useRouter()
  const { draft, setDraft } = useWizard()

  function onChange(key: keyof Address, value: string) {
    setDraft((d) => {
      const next = { ...d, sender: { ...d.sender, [key]: value } }
      if (key === 'country') next.originCountry = value
      if (key === 'postalCode') next.originPostalCode = value
      return next
    })
  }

  const a = draft.sender
  const valid = [a.fullName, a.address1, a.postalCode, a.city, a.email, a.phone].every(required)

  return (
    <WizardScreen title="Who is sending the parcel?" step={4} onContinue={() => router.push('/send/recipient')} continueDisabled={!valid}>
      <AddressForm value={draft.sender} onChange={onChange} minimal />
    </WizardScreen>
  )
}
