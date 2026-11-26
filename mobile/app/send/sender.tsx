import { useRouter } from 'expo-router'
import { WizardScreen } from '@/components/WizardScreen'
import { AddressForm } from '@/components/AddressForm'
import { useWizard } from '@/lib/wizard-context'
import { addressProblems } from '@/lib/addressRules'
import { addressHint } from '@/lib/problems'
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

  // The same checks the server makes, so a detail it would refuse is caught on this step.
  const problems = addressProblems(draft.sender)

  return (
    <WizardScreen
      title={tr.senderTitle}
      subtitle={tr.senderHint}
      step={4}
      icon={senderImage}
      onContinue={() => router.push('/send/recipient')}
      continueDisabled={problems.length > 0}
      continueHint={addressHint(problems, tr)}
    >
      <AddressForm value={draft.sender} onChange={onChange} minimal countryLabel={tr.senderCountryLabel} />
    </WizardScreen>
  )
}
