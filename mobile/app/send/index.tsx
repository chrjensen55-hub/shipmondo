import { useRouter } from 'expo-router'
import { ActivityIndicator, Pressable, View, useWindowDimensions } from 'react-native'
import { Check } from 'lucide-react-native'
import { useWizard, CARRIERS, deliveryOptionsFor } from '@/lib/wizard-context'
import { useLocations } from '@/lib/location-context'
import { CarrierLogo } from '@/components/CarrierLogo'
import { WizardScreen } from '@/components/WizardScreen'
import { useLang } from '@/lib/i18n'
import { TABLET_MIN_WIDTH } from '@/lib/layout'
import { useTapOnce } from '@/lib/useTapOnce'

// Selecting a carrier moves straight on to delivery, so this step has no Continue button. The logos
// are the main target on the screen and are sized to be easy to find and tap on a counter tablet.
export default function CarrierStep() {
  const router = useRouter()
  const { draft, setDraft } = useWizard()
  const { activeLocation } = useLocations()
  const tr = useLang()
  const tablet = useWindowDimensions().width >= TABLET_MIN_WIDTH
  // The tapped logo is marked and shows a spinner at once; the next page opens a moment later.
  const tap = useTapOnce()

  // A carrier turned off for this tablet's location never shows up here at all.
  const carriers = CARRIERS.filter((c) => activeLocation.carriers[c.name] !== false)

  function select(name: string) {
    tap.run(name, () => {
      // Switching to a carrier without the current delivery choice (e.g. Business → Bring) falls back to Home.
      setDraft((d) => ({
        ...d,
        carrierName: name,
        ...(name === 'PostNord' ? {} : { registeredLetter: false }),
        ...(deliveryOptionsFor(name).includes(d.deliveryLocation) ? {} : { deliveryLocation: 'home' as const }),
      }))
      router.push('/send/delivery')
    })
  }

  return (
    <WizardScreen title={tr.carrierHeading} subtitle={tr.carrierHint} step={1}>
      <View className="flex-row flex-wrap gap-3">
        {carriers.map((c) => {
          const opening = tap.busy === c.name
          // While one logo is opening, the earlier choice is no longer shown as the chosen one.
          const selected = opening || (tap.busy === null && draft.carrierName === c.name)
          return (
            <Pressable
              key={c.name}
              accessibilityRole="radio"
              accessibilityState={{ selected, busy: opening }}
              accessibilityLabel={c.name}
              onPress={() => select(c.name)}
              className={`min-h-[160px] flex-grow basis-[47%] items-center justify-center rounded-lg border-2 py-8 active:bg-mint sm:min-h-[230px] ${selected ? 'border-ocean' : 'border-line'} ${opening ? 'bg-mint' : 'bg-white'}`}
            >
              {opening ? (
                <View className="absolute right-3 top-3 h-6 w-6 items-center justify-center">
                  <ActivityIndicator size="small" color="#0B4F82" />
                </View>
              ) : selected ? (
                <View className="absolute right-3 top-3 h-6 w-6 items-center justify-center rounded-full bg-ocean">
                  <Check size={14} color="#ffffff" />
                </View>
              ) : null}
              <CarrierLogo name={c.name} size={tablet ? 150 : 108} />
            </Pressable>
          )
        })}
      </View>
    </WizardScreen>
  )
}
