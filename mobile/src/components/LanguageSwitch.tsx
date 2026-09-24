import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Lang } from '@/lib/i18n'
import { colors, radius } from '@/lib/theme'

// Emoji flags render consistently on Android's system emoji font without needing bundled image
// or SVG assets — the DA/EN letters underneath are a fallback for the rare device where the
// flag glyph doesn't render, so the switch stays usable either way.
export function LanguageSwitch({ lang, onChange }: { lang: Lang; onChange: (lang: Lang) => void }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.wrap, { top: insets.top + 20 }]}>
      <Pressable style={[styles.button, lang === 'da' && styles.buttonSelected]} onPress={() => onChange('da')} accessibilityLabel="Dansk">
        <Text style={styles.flag}>🇩🇰</Text>
        <Text style={[styles.code, lang === 'da' && styles.codeSelected]}>DA</Text>
      </Pressable>
      <Pressable style={[styles.button, lang === 'en' && styles.buttonSelected]} onPress={() => onChange('en')} accessibilityLabel="English">
        <Text style={styles.flag}>🇬🇧</Text>
        <Text style={[styles.code, lang === 'en' && styles.codeSelected]}>EN</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    gap: 6,
    zIndex: 50,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  buttonSelected: { borderColor: colors.ocean, backgroundColor: colors.mint },
  flag: { fontSize: 18 },
  code: { fontSize: 12, fontWeight: '700', color: colors.muted },
  codeSelected: { color: colors.ocean },
})
