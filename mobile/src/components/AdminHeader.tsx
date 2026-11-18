import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChevronLeft } from 'lucide-react-native'
import { PADDED_MAX_WIDTH } from '@/lib/layout'

// Same heading on every admin screen: an optional link back, the page title with a short grey
// line under it, and room for one action on the right (e.g. Sign out).
export function AdminHeader({ title, subtitle, backLabel, onBack, action }: { title: string; subtitle?: string; backLabel?: string; onBack?: () => void; action?: ReactNode }) {
  return (
    <View className={`w-full ${PADDED_MAX_WIDTH} gap-2 self-center px-5 pb-3 pt-4`}>
      {backLabel && onBack ? (
        <Pressable accessibilityRole="button" onPress={onBack} hitSlop={8} className="flex-row items-center gap-1 self-start py-1 active:opacity-60">
          <ChevronLeft size={18} color="#0B4F82" />
          <Text className="text-base font-semibold text-ocean">{backLabel}</Text>
        </Pressable>
      ) : null}
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-[28px] font-semibold text-ink" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text className="text-sm text-muted">{subtitle}</Text> : null}
        </View>
        {action}
      </View>
    </View>
  )
}
