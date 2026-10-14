import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { useWizard, CARRIERS } from '@/lib/wizard-context'
import { useLocations } from '@/lib/location-context'
import { CarrierLogo } from '@/components/CarrierLogo'
import { WizardScreen } from '@/components/WizardScreen'
import { useLang } from '@/lib/i18n'

// Selecting a carrier moves straight on to delivery, so this step has no Continue button. The logos
// are the main target on the screen and are sized to be easy to find and tap on a counter tablet.
export default function CarrierStep() {
  const router = useRouter()
  const { draft, setDraft } = useWizard()
  const { activeLocation } = useLocations()
  const tr = useLang()

  // A carrier turned off for this tablet's location never shows up here at all.
  const carriers = CARRIERS.filter((c) => activeLocation.carriers[c.name] !== false)

  function select(name: string) {
    setDraft((d) => ({ ...d, carrierName: name }))
    router.push('/send/delivery')
  }

  return (
    <WizardScreen title={tr.carrierHeading} step={1}>
      <View className="flex-row flex-wrap gap-3">
        {carriers.map((c) => {
          const selected = draft.carrierName === c.name
          return (
            <Pressable
              key={c.name}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={c.name}
              onPress={() => select(c.name)}
              className={`min-h-[160px] flex-grow basis-[47%] items-center justify-center rounded-lg border-2 bg-white py-8 active:bg-cream ${selected ? 'border-ocean bg-mint' : 'border-line'}`}
            >
              {selected && (
                <View className="absolute right-3 top-3 h-6 w-6 items-center justify-center rounded-full bg-ocean">
                  <Check size={14} color="#ffffff" />
                </View>
              )}
              <CarrierLogo name={c.name} size={108} />
            </Pressable>
          )
        })}
      </View>
    </WizardScreen>
  )
}
