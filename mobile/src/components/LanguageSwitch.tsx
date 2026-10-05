import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Lang } from '@/lib/i18n'

// Emoji flags render on Android's system emoji font without bundled image assets. The DA/EN code
// beside each flag keeps the switch usable even where a flag glyph doesn't render.
export function LanguageSwitch({ lang, onChange }: { lang: Lang; onChange: (lang: Lang) => void }) {
  const insets = useSafeAreaInsets()
  return (
    <View className="absolute right-3 z-50 flex-row gap-1.5" style={{ top: insets.top + 20 }}>
      <LangButton code="DA" flag="🇩🇰" label="Dansk" selected={lang === 'da'} onPress={() => onChange('da')} />
      <LangButton code="EN" flag="🇬🇧" label="English" selected={lang === 'en'} onPress={() => onChange('en')} />
    </View>
  )
}

function LangButton({ code, flag, label, selected, onPress }: { code: string; flag: string; label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      className={`h-10 flex-row items-center gap-1 rounded-md border bg-white px-2.5 shadow-sm active:bg-cream ${selected ? 'border-ocean bg-mint' : 'border-line'}`}
    >
      <Text className="text-lg">{flag}</Text>
      <Text className={`text-xs font-bold ${selected ? 'text-ocean' : 'text-muted'}`}>{code}</Text>
    </Pressable>
  )
}
