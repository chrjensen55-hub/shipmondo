import { Text, View } from 'react-native'
import { useLang } from '@/lib/i18n'

// A real fraction (0..1) from the BLE write loop, not a fake timed animation. Shown full-width in
// place of the print button so there's nothing to tap while a label is on its way to the printer.
export function PrintProgressBar({ progress }: { progress: number }) {
  const tr = useLang()
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100)
  return (
    <View className="w-full gap-2" accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }}>
      <View className="h-2.5 overflow-hidden rounded-sm bg-line">
        <View className="h-full rounded-sm bg-ocean" style={{ width: `${percent}%` }} />
      </View>
      <Text className="text-center text-sm font-semibold text-ink">
        {tr.printingProgress} {percent}% {tr.printingWaitSuffix}
      </Text>
    </View>
  )
}
