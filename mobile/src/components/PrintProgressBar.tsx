import { StyleSheet, Text, View } from 'react-native'
import { useLang } from '@/lib/i18n'
import { colors, radius } from '@/lib/theme'

// A real fraction (0..1) from the BLE write loop, not a fake timed animation — see
// printZplViaBluetooth's onProgress. Shown full-width and impossible to miss, with explicit
// "please wait" copy, because the print button's own spinner is easy to miss on a large tablet
// screen and staff kept assuming a first tap hadn't registered and tapping again. Used from both
// the customer wizard (inside LangContext.Provider) and the staff-only admin reprint screen
// (outside it, where useLang falls back to the context's Danish default) — either way it renders
// correctly, just always Danish on the admin screen.
export function PrintProgressBar({ progress }: { progress: number }) {
  const tr = useLang()
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100)
  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      <Text style={styles.label}>
        {tr.printingProgress} {percent}% {tr.printingWaitSuffix}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 6 },
  track: { height: 10, borderRadius: radius.sm, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.ocean, borderRadius: radius.sm },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, textAlign: 'center' },
})
