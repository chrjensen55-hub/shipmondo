import { Text, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { useLang } from '@/lib/i18n'

// Fixed 7-step scale (carrier, delivery, parcel, sender, recipient, customs, review). Customs is
// skipped on domestic routes, so the bar jumps from 5 to 7 there — still reads as forward progress.
const TOTAL_STEPS = 7

// Completed steps show a check, the current step is filled and ringed, upcoming steps stay grey.
// The "Step X of Y" line keeps the position readable even when the dots are small on a phone.
export function StepProgress({ step }: { step: number }) {
  const tr = useLang()
  return (
    <View className="gap-2" accessibilityRole="progressbar" accessibilityLabel={`${tr.stepLabel} ${step} ${tr.stepOf} ${TOTAL_STEPS}`}>
      <View className="flex-row items-center">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
          const n = i + 1
          const done = n < step
          const current = n === step
          return (
            <View key={n} className="flex-1 flex-row items-center">
              <View
                className={`h-7 w-7 items-center justify-center rounded-full border-2 ${
                  done ? 'border-ocean bg-ocean' : current ? 'border-ocean bg-white' : 'border-line bg-white'
                }`}
              >
                {done ? (
                  <Check size={14} color="#ffffff" />
                ) : (
                  <Text className={`text-xs font-bold ${current ? 'text-ocean' : 'text-muted'}`}>{n}</Text>
                )}
              </View>
              {n < TOTAL_STEPS && <View className={`h-0.5 flex-1 ${done ? 'bg-ocean' : 'bg-line'}`} />}
            </View>
          )
        })}
      </View>
      <Text className="text-xs font-semibold text-muted">
        {tr.stepLabel} {step} {tr.stepOf} {TOTAL_STEPS}
      </Text>
    </View>
  )
}
