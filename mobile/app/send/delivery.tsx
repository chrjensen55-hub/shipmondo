import { useRouter } from 'expo-router'
import { Image, Pressable, Text, View } from 'react-native'
import { WizardScreen } from '@/components/WizardScreen'
import { useWizard, SERVICE_POINT_LABEL, firstParcelSize, deliveryOptionsFor } from '@/lib/wizard-context'
import { useLocations } from '@/lib/location-context'
import { weightBrackets } from '@/lib/carrierRates'
import { useLang } from '@/lib/i18n'
import type { DeliveryLocation } from '@/lib/types'

// require() (not import) is the standard Expo/React Native pattern for static image assets - see
// CarrierLogo.tsx for why.
/* eslint-disable @typescript-eslint/no-require-imports */
const servicePointImage = require('../../assets/images/service-point.png')
const homeDeliveryImage = require('../../assets/images/home-delivery.png')
const businessDeliveryImage = require('../../assets/images/business-delivery.png')
/* eslint-enable @typescript-eslint/no-require-imports */

export default function DeliveryStep() {
  const router = useRouter()
  const { draft, setDraft } = useWizard()
  const { activeLocation } = useLocations()
  const tr = useLang()

  function select(location: DeliveryLocation) {
    setDraft((d) => {
      const brackets = weightBrackets(location, activeLocation.rates)
      return { ...d, deliveryLocation: location, ...(location === 'service_point' ? { registeredLetter: false } : {}), parcels: d.parcels.map((p) => (brackets.includes(p.weight) ? p : { ...p, ...firstParcelSize(location, activeLocation.rates) })) }
    })
  }

  const servicePointLabel = draft.carrierName ? (SERVICE_POINT_LABEL[draft.carrierName] ?? tr.servicePointFallback) : tr.servicePointFallback
  const cards: Record<DeliveryLocation, { image: number; title: string; subtitle: string }> = {
    service_point: { image: servicePointImage, title: servicePointLabel, subtitle: tr.servicePointSubtitle },
    home: { image: homeDeliveryImage, title: tr.homeDelivery, subtitle: tr.homeDeliverySubtitle },
    business: { image: businessDeliveryImage, title: tr.businessDelivery, subtitle: tr.businessDeliverySubtitle },
  }

  return (
    <WizardScreen title={tr.deliveryHeading} subtitle={tr.deliveryHint} step={2} onContinue={() => router.push('/send/parcel')}>
      {deliveryOptionsFor(draft.carrierName).map((location) => (
        <DeliveryCard key={location} selected={draft.deliveryLocation === location} onPress={() => select(location)} {...cards[location]} />
      ))}
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
      className={`flex-row items-center gap-4 rounded-md border-2 bg-white p-4 active:bg-cream ${selected ? 'border-ocean' : 'border-line'}`}
    >
      <Image source={image} className="h-[72px] w-[72px]" resizeMode="contain" alt="" />
      <View className="flex-1 gap-1">
        <Text className="text-base font-bold text-ink">{title}</Text>
        <Text className="text-sm text-muted">{subtitle}</Text>
      </View>
      <View className={`h-6 w-6 items-center justify-center rounded-full border-2 ${selected ? 'border-ocean' : 'border-line'}`}>
        {selected && <View className="h-3 w-3 rounded-full bg-ocean" />}
      </View>
    </Pressable>
  )
}
