import { useRouter } from 'expo-router'
import { Image, Pressable, Text, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { WizardScreen } from '@/components/WizardScreen'
import { useWizard, SERVICE_POINT_LABEL, firstParcelSize } from '@/lib/wizard-context'
import { weightBrackets } from '@/lib/carrierRates'
import { useLang } from '@/lib/i18n'
import type { DeliveryLocation } from '@/lib/types'

// require() (not import) is the standard Expo/React Native pattern for static image assets - see
// CarrierLogo.tsx for why.
/* eslint-disable @typescript-eslint/no-require-imports */
const servicePointImage = require('../../assets/images/service-point.png')
const homeDeliveryImage = require('../../assets/images/home-delivery.png')
/* eslint-enable @typescript-eslint/no-require-imports */

export default function DeliveryStep() {
  const router = useRouter()
  const { draft, setDraft } = useWizard()
  const tr = useLang()

  function select(location: DeliveryLocation) {
    setDraft((d) => {
      const brackets = weightBrackets(location)
      return { ...d, deliveryLocation: location, parcels: d.parcels.map((p) => (brackets.includes(p.weight) ? p : { ...p, ...firstParcelSize(location) })) }
    })
  }

  const servicePointLabel = draft.carrierName ? (SERVICE_POINT_LABEL[draft.carrierName] ?? tr.servicePointFallback) : tr.servicePointFallback

  return (
    <WizardScreen title={tr.deliveryHeading} step={2} onContinue={() => router.push('/send/parcel')}>
      <DeliveryCard selected={draft.deliveryLocation === 'service_point'} onPress={() => select('service_point')} image={servicePointImage} title={servicePointLabel} subtitle={tr.servicePointSubtitle} />
      <DeliveryCard selected={draft.deliveryLocation === 'home'} onPress={() => select('home')} image={homeDeliveryImage} title={tr.homeDelivery} subtitle={tr.homeDeliverySubtitle} />
    </WizardScreen>
  )
}

function DeliveryCard({ selected, onPress, image, title, subtitle }: { selected: boolean; onPress: () => void; image: number; title: string; subtitle: string }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      className={`items-center gap-2 rounded-lg border-2 bg-white p-5 active:bg-cream ${selected ? 'border-ocean' : 'border-line'}`}
    >
      {selected && (
        <View className="absolute right-3 top-3 h-6 w-6 items-center justify-center rounded-full bg-ocean">
          <Check size={14} color="#ffffff" />
        </View>
      )}
      <Image source={image} className="mb-1 h-[72px] w-[72px]" resizeMode="contain" alt="" />
      <Text className="text-lg font-bold text-ink">{title}</Text>
      <Text className="text-center text-base text-muted">{subtitle}</Text>
    </Pressable>
  )
}
