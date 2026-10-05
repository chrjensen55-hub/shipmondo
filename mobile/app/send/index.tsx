import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'
import { useWizard, CARRIERS } from '@/lib/wizard-context'
import { CarrierLogo } from '@/components/CarrierLogo'
import { WizardScreen } from '@/components/WizardScreen'
import { useLang } from '@/lib/i18n'

// Selecting a carrier moves straight on to delivery, so this step has no Continue button. The logos
// are the main target on the screen and are sized to be easy to find and tap on a counter tablet.
export default function CarrierStep() {
  const router = useRouter()
  const { draft, setDraft } = useWizard()
  const tr = useLang()

  function select(name: string) {
    setDraft((d) => ({ ...d, carrierName: name }))
    router.push('/send/delivery')
  }

  return (
    <WizardScreen title={tr.carrierHeading} step={1}>
      <View className="flex-row flex-wrap gap-3">
        {CARRIERS.map((c) => {
          const selected = draft.carrierName === c.name
          return (
            <Pressable
              key={c.name}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={c.name}
              onPress={() => select(c.name)}
              className={`min-h-[160px] flex-grow basis-[47%] items-center justify-center rounded-lg border-2 bg-white py-8 active:bg-cream ${selected ? 'border-ocean' : 'border-line'}`}
            >
              <CarrierLogo name={c.name} size={108} />
            </Pressable>
          )
        })}
      </View>
    </WizardScreen>
  )
}
